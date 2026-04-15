import { useState, useRef, useCallback, useEffect } from 'react'
import { Crown, Shirt, Package, Star, X, Zap } from 'lucide-react'

import mogiBeanieImg from '../assets/mogi beanie.png'
import mogiHoodieImg from '../assets/mogi hoodie.png'
import plaidHoodieImg from '../assets/plaid hoodie.png'
import monsterBeanieImg from '../assets/monster beanie.png'
import crewneckImg from '../assets/crewneck.png'
import stripeImg from '../assets/stripe.png'

// ═══════════════════════════════════════════════════════════════════════════
// INVENTORY — replace color/accent with real PNG paths when assets are ready
// ═══════════════════════════════════════════════════════════════════════════

const INVENTORY = {
  headwear: [
    { id: 'h1', name: 'MOGI Beanie', image: mogiBeanieImg, color: '#1a2744', accent: '#f5a623' },
    { id: 'h2', name: 'Monster Beanie', image: monsterBeanieImg, color: '#1a1a1a', accent: '#e8c94f' },
    { id: 'h3', name: 'Bucket Hat',     color: '#6b7c4a', accent: '#f5e6c8' },
  ],
  tops: [
    { id: 't1', name: 'Plaid Hoodie', image: plaidHoodieImg, color: '#8b2635', accent: '#f5a623' },
    { id: 't2', name: 'Stripe Shirt', image: stripeImg, scale: 1.35, color: '#87ceeb', accent: '#cc2200' },
    { id: 't3', name: 'Stripe Crewneck', image: crewneckImg, color: '#5b9bd5', accent: '#8b2635' },
    { id: 't4', name: 'Rasta Tee',       color: '#2d5016', accent: '#f5a623' },
    { id: 't5', name: 'Denim Jacket',    color: '#4a5d7a', accent: '#f5a623' },
    { id: 't6', name: 'MOGI Hoodie', image: mogiHoodieImg, color: '#1a1a1a', accent: '#e8c94f' },
  ],
  bottoms: [
    { id: 'b1', name: 'Wide Khakis',  color: '#c8a96a', accent: '#2d2d2d' },
    { id: 'b2', name: 'Dark Shorts',  color: '#2d3748', accent: '#f5a623' },
    { id: 'b3', name: 'Denim Shorts', color: '#4a5d7a', accent: '#e8e8e8' },
  ],
}

const TABS = [
  { id: 'headwear', Icon: Crown,   label: 'HATS'    },
  { id: 'tops',     Icon: Shirt,   label: 'TOPS'    },
  { id: 'bottoms',  Icon: Package, label: 'BOTTOMS' },
]

// Per-item fixed rotations so they don't shift on re-render
const ROTATIONS = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3]

// Derive which outfit slot an item belongs to from its id prefix
function getSlot(item) {
  if (item.id.startsWith('h')) return 'head'
  if (item.id.startsWith('t')) return 'top'
  return 'bottom'
}

// Shared sketchy border-radius values
const R1 = '255px 15px 225px 15px/15px 225px 15px 255px'
const R2 = '15px 255px 15px 225px/225px 15px 255px 15px'
const SKIN = '#e8c9a0'

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM RE-COLORABLE POINTER CURSORS
// ═══════════════════════════════════════════════════════════════════════════

const CURSOR_SVG = (fill) => `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='38' height='38' viewBox='0 0 24 24'><path fill='${fill.replace('#', '%23')}' stroke='%231a2744' stroke-width='1.5' stroke-linejoin='round' d='M4,3 L4,21 L9,15.5 L13,23 L16,21.5 L12,14 L19,14 Z'/></svg>") 4 3`

const C = {
  default:   `${CURSOR_SVG('#5b9bd5')}, auto`,
  pointer:   `${CURSOR_SVG('#f5a623')}, pointer`,
  grab:      `${CURSOR_SVG('#87ceeb')}, grab`,
  grabbing:  `${CURSOR_SVG('#8b2635')}, grabbing`,
  crosshair: `${CURSOR_SVG('#2d5016')}, crosshair`,
  copy:      `${CURSOR_SVG('#7aad5a')}, copy`,
}

// ═══════════════════════════════════════════════════════════════════════════
// SVG FILTER DEFS  — hidden, referenced via filter: url(#id)
// ═══════════════════════════════════════════════════════════════════════════

function SvgDefs() {
  return (
    <svg
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        {/* Heavy warp: floor, back-wall window, character body shapes */}
        <filter id="heavy-warp" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves="3"
            result="noise"
            seed="2"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Micro warp: wardrobe items, sidebar panel, buttons, sticker cards */}
        <filter id="micro-warp" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.065"
            numOctaves="2"
            result="noise"
            seed="8"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND LAYER — paper noise overlay
// ═══════════════════════════════════════════════════════════════════════════

function PaperOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        pointerEvents: 'none',
        zIndex: 0,
        mixBlendMode: 'multiply',
        opacity: 0.6,
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOOR — diamond/argyle pattern, heavy-warp applied
// ═══════════════════════════════════════════════════════════════════════════

function Floor() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '22vh',
        backgroundImage: `
          linear-gradient(135deg, #b84a4a 25%, transparent 25%),
          linear-gradient(225deg, #b84a4a 25%, transparent 25%),
          linear-gradient(315deg, #b84a4a 25%, transparent 25%),
          linear-gradient(45deg,  #b84a4a 25%, transparent 25%)
        `,
        backgroundSize: '30px 30px',
        backgroundColor: '#963535',
        filter: 'url(#heavy-warp)',
        zIndex: 1,
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BACK WINDOW — tilted red frame on the wall, heavy-warp applied
// ═══════════════════════════════════════════════════════════════════════════

function BackWindow() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '16%',
        left: '12%',
        width: 196,
        height: 236,
        transform: 'rotate(-2deg)',
        filter: 'url(#heavy-warp)',
        zIndex: 2,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#cde8d4',
          border: '10px solid #b84a4a',
          borderRadius: 6,
          boxShadow: '6px 6px 0 0 #2d2d2d',
        }}
      >
        {/* Horizontal cross-bar */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: 8, background: '#b84a4a', transform: 'translateY(-50%)',
        }} />
        {/* Vertical cross-bar */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: '50%',
          width: 8, background: '#b84a4a', transform: 'translateX(-50%)',
        }} />
        {/* Sky tint in panes */}
        {['0 0', '50% 0', '0 50%', '50% 50%'].map((pos, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 'calc(50% - 9px)',
              height: 'calc(50% - 9px)',
              left: i % 2 === 0 ? 4 : 'auto',
              right: i % 2 === 1 ? 4 : 'auto',
              top: i < 2 ? 4 : 'auto',
              bottom: i >= 2 ? 4 : 'auto',
              background: 'rgba(200,230,240,0.4)',
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGO BLOB — top-left organic blob, micro-warp on shape, text unfiltered
// ═══════════════════════════════════════════════════════════════════════════

function LogoBlob() {
  return (
    <div
      style={{
        position: 'absolute',
        top: -18,
        left: -18,
        width: 186,
        height: 130,
        zIndex: 20,
      }}
    >
      {/* Filtered blob shape */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#7aad5a',
          borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
          border: '4px solid #2d2d2d',
          boxShadow: '5px 5px 0 0 #2d2d2d',
          filter: 'url(#micro-warp)',
        }}
      />
      {/* Unfiltered text — DO NOT add filter here */}
      <div
        style={{
          position: 'absolute',
          bottom: 22,
          left: 24,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        <div style={{
          fontFamily: '"Luckiest Guy", cursive',
          fontSize: 26,
          color: '#f5a623',
          letterSpacing: 3,
          textShadow: '3px 3px 0 #2d2d2d, -1px -1px 0 #2d2d2d',
          WebkitTextStroke: '1px #2d2d2d',
        }}>
          MOGIS
        </div>
        <div style={{
          fontFamily: '"Luckiest Guy", cursive',
          fontSize: 18,
          color: '#f5e6c8',
          letterSpacing: 4,
          textShadow: '2px 2px 0 #2d2d2d',
          marginTop: 1,
        }}>
          WORLD
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR NAV — wobbly panel with category switcher, micro-warp on bg
// ═══════════════════════════════════════════════════════════════════════════

function Sidebar({ activeTab, onTabChange }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '22%',
        left: 14,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Filtered background panel — no text inside */}
      <div
        style={{
          position: 'absolute',
          top: -14,
          left: -10,
          width: 64,
          height: TABS.length * 54 + 44,
          background: '#f5e6c8',
          border: '4px solid #2d2d2d',
          boxShadow: '4px 4px 0 0 #2d2d2d',
          borderRadius: R1,
          filter: 'url(#micro-warp)',
        }}
      />

      {/* Tab buttons — icons only, not filtered individually */}
      {TABS.map(({ id, Icon, label }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            title={label}
            style={{
              position: 'relative',
              zIndex: 2,
              width: 60,
              height: 60,
              background: active ? '#f5a623' : '#fdf4e3',
              border: `3px solid #2d2d2d`,
              boxShadow: active ? '2px 2px 0 0 #2d2d2d' : '3px 3px 0 0 #2d2d2d',
              borderRadius: 10,
              cursor: C.pointer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: active ? 'translate(1px,1px)' : 'none',
              transition: 'all 0.1s',
              outline: 'none',
            }}
          >
            <Icon size={36} color="#2d2d2d" strokeWidth={2.5} />
          </button>
        )
      })}

      {/* Decorative star — unfiltered text */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          fontFamily: '"Luckiest Guy", cursive',
          fontSize: 24,
          color: '#f5a623',
          textShadow: '2px 2px 0 #2d2d2d',
          lineHeight: 1,
          marginTop: 2,
        }}
      >
        ★
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARACTER DOLL — CSS shapes, heavy-warp per part, text unfiltered
// Drop zone for drag-and-drop; also handles per-slot click unequip
// ═══════════════════════════════════════════════════════════════════════════

function CharacterDoll({ dollRef, equipped, dragOver, isMobile, onUnequip }) {
  // Reusable style factory for warped body-part divs
  const part = (extra = {}) => ({
    position: 'absolute',
    border: '4px solid #2d2d2d',
    filter: 'url(#heavy-warp)',
    ...extra,
  })

  return (
    <div
      ref={dollRef}
      style={{
        position: 'absolute',
        bottom: isMobile ? '18%' : '20vh',
        top: 'auto',
        left: isMobile ? '2%' : '42%',
        marginLeft: 0,
        width: 174,
        height: 410,
        zIndex: 10,
        cursor: dragOver ? C.copy : C.default,
        transform: `scale(${isMobile ? 0.75 : 1.5})`,
        transformOrigin: isMobile ? 'bottom left' : 'bottom center',
      }}
    >
      {/* Drop-zone ring — only visible while dragging over */}
      {dragOver && (
        <div
          style={{
            position: 'absolute',
            inset: -10,
            border: '3px dashed #f5a623',
            borderRadius: 20,
            pointerEvents: 'none',
            zIndex: 20,
            animation: 'pulse-ring 0.9s ease-in-out infinite',
          }}
        />
      )}

      {/* ── HEAD ── */}
      <div
        style={part({
          width: 90,
          height: 90,
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          background: SKIN,
          borderRadius: '50%',
          boxShadow: '4px 4px 0 0 #2d2d2d',
          zIndex: 5,
          overflow: 'visible',
        })}
      >
        {/* Hat / headwear overlay — rendered inside head, unfiltered shape */}
        {equipped.head && (
          <div
            onClick={() => onUnequip('head')}
            title="Click to unequip"
            style={{
              position: 'absolute',
              top: -22,
              left: -8,
              right: -8,
              height: '58%',
              background: equipped.head.color,
              borderRadius: '50% 50% 8% 8% / 60% 60% 8% 8%',
              border: '3px solid #2d2d2d',
              borderBottom: 'none',
              zIndex: 6,
              cursor: C.pointer,
              overflow: 'hidden',
            }}
          >
            {/* Accent band at brim */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 9,
              background: equipped.head.accent,
              borderTop: '2px solid #2d2d2d',
            }} />
          </div>
        )}

        {/* ── Face — NO filter on text/detail elements ── */}
        {/* Brows */}
        <div style={{ position:'absolute', top:'26%', left:'10%',  width:20, height:5, background:'#2d2d2d', transform:'rotate(-10deg)', borderRadius:2 }} />
        <div style={{ position:'absolute', top:'26%', right:'10%', width:20, height:5, background:'#2d2d2d', transform:'rotate(10deg)',  borderRadius:2 }} />
        {/* Eyes (squinting slits) */}
        <div style={{ position:'absolute', top:'38%', left:'12%',  width:16, height:9, background:'#2d2d2d', borderRadius:'0 0 6px 6px' }} />
        <div style={{ position:'absolute', top:'38%', right:'12%', width:16, height:9, background:'#2d2d2d', borderRadius:'0 0 6px 6px' }} />
        {/* Bandaid */}
        <div style={{
          position:'absolute', top:'52%', left:'5%',
          width:20, height:10,
          background:'#f5c5a3', border:'2px solid #2d2d2d',
          borderRadius:3, transform:'rotate(-15deg)',
          overflow:'hidden',
        }}>
          <div style={{ position:'absolute', inset:'30% 5px', background:'#dfa880', borderRadius:2 }} />
        </div>
        {/* Grin / teeth row */}
        <div style={{
          position:'absolute', bottom:'10%', left:'14%', right:'14%',
          height:18, background:'#2d2d2d',
          borderRadius:'0 0 14px 14px', overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center', gap:1,
        }}>
          {['M','O','G','I'].map(l => (
            <div key={l} style={{
              width:'22%', height:'80%',
              background:'#f0f0f0', border:'1px solid #888',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <span style={{ fontFamily:'"Luckiest Guy",cursive', fontSize:8, color:'#2d2d2d', lineHeight:1 }}>{l}</span>
            </div>
          ))}
        </div>
        {/* Ears */}
        <div style={{ position:'absolute', top:'36%', left:-13, width:14, height:20, background:SKIN, border:'3px solid #2d2d2d', borderRadius:'50%' }} />
        <div style={{ position:'absolute', top:'36%', right:-13, width:14, height:20, background:SKIN, border:'3px solid #2d2d2d', borderRadius:'50%' }} />
      </div>

      {/* ── NECK ── */}
      <div style={part({
        width:22, height:18, top:88, left:'50%',
        transform:'translateX(-50%)',
        background:SKIN, borderRadius:4,
        boxShadow:'2px 2px 0 0 #2d2d2d', zIndex:4,
        borderTop:'none',
      })} />

      {/* ── TORSO ── click to unequip top */}
      <div
        onClick={equipped.top ? () => onUnequip('top') : undefined}
        title={equipped.top ? 'Click to unequip' : 'Drop a top here'}
        style={part({
          width:116, height:134, top:102, left:'50%',
          transform:'translateX(-50%)',
          background: equipped.top ? equipped.top.color : '#f0dfc0',
          borderRadius:R1,
          boxShadow: dragOver ? `0 0 0 3px #f5a623, 4px 4px 0 0 #2d2d2d` : '4px 4px 0 0 #2d2d2d',
          transition:'background 0.22s, box-shadow 0.15s',
          zIndex:4,
          cursor: equipped.top ? C.pointer : C.crosshair,
          overflow:'hidden',
        })}
      >
        {/* Brand mark — unfiltered text over torso */}
        {equipped.top && (
          <div style={{
            position:'absolute', inset:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            pointerEvents:'none',
          }}>
            <span style={{
              fontFamily:'"Luckiest Guy",cursive',
              fontSize:14, color:equipped.top.accent,
              textShadow:'1px 1px 0 #2d2d2d',
              WebkitTextStroke:'0.5px #2d2d2d',
            }}>MOGI</span>
          </div>
        )}
      </div>

      {/* ── LEFT ARM ── */}
      <div style={part({
        width:28, height:104, top:106, left:6,
        background: equipped.top ? equipped.top.color : '#f0dfc0',
        transform:'rotate(10deg)', transformOrigin:'top center',
        borderRadius:'15px 225px 15px 255px / 225px 15px 255px 15px',
        boxShadow:'3px 3px 0 0 #2d2d2d',
        transition:'background 0.22s', zIndex:3,
      })} />
      {/* Left hand */}
      <div style={part({ width:22, height:22, top:198, left:4, background:SKIN, borderRadius:'50%', boxShadow:'2px 2px 0 0 #2d2d2d', zIndex:3 })} />

      {/* ── RIGHT ARM ── */}
      <div style={part({
        width:28, height:104, top:106, right:6,
        background: equipped.top ? equipped.top.color : '#f0dfc0',
        transform:'rotate(-10deg)', transformOrigin:'top center',
        borderRadius:'225px 15px 255px 15px / 15px 255px 15px 225px',
        boxShadow:'3px 3px 0 0 #2d2d2d',
        transition:'background 0.22s', zIndex:3,
      })} />
      {/* Right hand */}
      <div style={part({ width:22, height:22, top:198, right:4, background:SKIN, borderRadius:'50%', boxShadow:'2px 2px 0 0 #2d2d2d', zIndex:3 })} />

      {/* ── LEFT LEG ── click to unequip bottom */}
      <div
        onClick={equipped.bottom ? () => onUnequip('bottom') : undefined}
        title={equipped.bottom ? 'Click to unequip' : 'Drop bottoms here'}
        style={part({
          width:46, height:126, top:228, left:'16%',
          background: equipped.bottom ? equipped.bottom.color : '#2d3050',
          transform:'rotate(3deg)',
          borderRadius:R1, boxShadow:'3px 3px 0 0 #2d2d2d',
          transition:'background 0.22s', zIndex:3,
          cursor: equipped.bottom ? C.pointer : C.crosshair,
        })}
      />
      {/* ── RIGHT LEG ── */}
      <div
        onClick={equipped.bottom ? () => onUnequip('bottom') : undefined}
        title={equipped.bottom ? 'Click to unequip' : 'Drop bottoms here'}
        style={part({
          width:46, height:126, top:228, right:'16%',
          background: equipped.bottom ? equipped.bottom.color : '#2d3050',
          transform:'rotate(-3deg)',
          borderRadius:R2, boxShadow:'3px 3px 0 0 #2d2d2d',
          transition:'background 0.22s', zIndex:3,
          cursor: equipped.bottom ? C.pointer : C.crosshair,
        })}
      />

      {/* ── LEFT FOOT ── */}
      <div style={part({
        width:54, height:21, bottom:0, left:'6%',
        background:'#1a1a1a', borderRadius:'50% 50% 50% 50% / 60% 60% 40% 40%',
        boxShadow:'3px 3px 0 0 #2d2d2d', zIndex:2,
      })} />
      {/* ── RIGHT FOOT ── */}
      <div style={part({
        width:54, height:21, bottom:0, right:'6%',
        background:'#1a1a1a', borderRadius:'50% 50% 50% 50% / 60% 60% 40% 40%',
        boxShadow:'3px 3px 0 0 #2d2d2d', zIndex:2,
      })} />

      {/* ── Equipped-item badges below character — unfiltered ── */}
      <div style={{
        position:'absolute', bottom:-70, left:'50%',
        transform:'translateX(-50%)',
        display:'flex', gap:7, flexWrap:'nowrap',
        zIndex:20, whiteSpace:'nowrap',
      }}>
        {[
          { slot:'head',   item: equipped.head   },
          { slot:'top',    item: equipped.top    },
          { slot:'bottom', item: equipped.bottom },
        ].filter(s => s.item).map(({ slot, item }) => (
          <button
            key={slot}
            onClick={() => onUnequip(slot)}
            style={{
              background:'#f5a623', border:'3px solid #2d2d2d',
              borderRadius:8, padding:'6px 12px',
              fontFamily:'"Balsamiq Sans",cursive',
              fontSize:14, fontWeight:700, color:'#2d2d2d',
              boxShadow:'3px 3px 0 0 #2d2d2d', cursor: C.pointer,
            }}
          >
            {item.name} ×
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// WARDROBE ITEM — filtered bg shape, unfiltered label on top
// ═══════════════════════════════════════════════════════════════════════════

function WardrobeItem({ item, isEquipped, isDragging, isMobile, rotation, onPointerDragStart, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onPointerDown={e => onPointerDragStart(e, item)}
      onClick={() => onClick(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: isMobile ? 110 : 180,
        height: isMobile ? 110 : 180,
        margin: isMobile ? '6px 4px' : '10px 12px',
        transform: `rotate(${rotation}deg) scale(${(hovered && !isMobile ? 1.08 : 1) * (item.scale || 1)})`,
        cursor: C.grab,
        flexShrink: 0,
        userSelect: 'none',
        transition: 'transform 0.12s ease',
        '--rot': `${rotation}deg`,
      }}
    >
      {/* Custom Hover Text Overlay */}
      {hovered && !isDragging && !isMobile && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#000',
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          fontSize: 22,
          fontWeight: 900,
          textAlign: 'center',
          letterSpacing: 1,
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          zIndex: 20,
          textShadow: '0px 0px 8px rgba(255,255,255,0.8)'
        }}>
          {item.name}
        </div>
      )}

      {item.image ? (
        <img 
          src={item.image} 
          alt={item.name}
          draggable="false"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            opacity: hovered && !isDragging && !isMobile ? 0.35 : 1,
            filter: isEquipped ? `drop-shadow(0 0 10px ${item.accent})` : 'drop-shadow(4px 4px 0px rgba(0,0,0,0.4))',
            transition: 'opacity 0.15s ease'
          }}
        />
      ) : (
        <>
          {/* Filtered visual layer — shape only, NO text */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: item.color,
              border: '4px solid #2d2d2d',
              boxShadow: isEquipped
                ? `0 0 0 3px ${item.accent}, 3px 3px 0 0 #2d2d2d`
                : '3px 3px 0 0 #2d2d2d',
              borderRadius: R1,
              filter: 'url(#micro-warp)',
            }}
          />
          {/* Unfiltered label + accent stripe — DO NOT add filter here */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              gap: 4,
            }}
          >
            <div style={{
              width: '50%', height: 6,
              background: item.accent, border: '2px solid #2d2d2d',
              borderRadius: 2,
            }} />
            <span style={{
              fontFamily: '"Balsamiq Sans", cursive',
              fontSize: 24, fontWeight: 700,
              color: item.accent, textAlign: 'center',
              lineHeight: 1.15, padding: '0 6px',
              textShadow: '1px 1px 0 rgba(0,0,0,0.85)',
              wordBreak: 'break-word',
              maxWidth: '95%',
            }}>
              {item.name}
            </span>
          </div>
        </>
      )}

      {/* Equipped checkmark badge */}
      {isEquipped && (
        <div style={{
          position: 'absolute', top: -12, right: -12,
          background: item.accent, border: '4px solid #2d2d2d',
          borderRadius: '50%', width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Balsamiq Sans",cursive',
          fontSize: 20, fontWeight: 900, color: '#2d2d2d',
          zIndex: 5, boxShadow: '3px 3px 0 0 #2d2d2d',
          pointerEvents: 'none',
        }}>✓</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// WARDROBE PANEL — right-side panel with scrollable item grid
// ═══════════════════════════════════════════════════════════════════════════

function Wardrobe({ items, equipped, isDragging, isMobile, onPointerDragStart, onClick }) {
  const isEquipped = item => equipped[getSlot(item)]?.id === item.id

  return (
    <div
      style={{
        position: 'absolute',
        top: isMobile ? '4%' : '4%',
        left: isMobile ? '44%' : 'auto',
        right: isMobile ? '1%' : '6%',
        width: isMobile ? '54%' : 630,
        bottom: '2%',
        zIndex: 15,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: isMobile ? 'flex-start' : 'center',
        overflowY: isMobile && isDragging ? 'hidden' : 'auto',
        touchAction: isMobile && isDragging ? 'none' : 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {items.map((item, idx) => (
        <WardrobeItem
          key={item.id}
          item={item}
          isEquipped={isEquipped(item)}
          isDragging={isDragging}
          isMobile={isMobile}
          rotation={ROTATIONS[idx % ROTATIONS.length]}
          onPointerDragStart={onPointerDragStart}
          onClick={onClick}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP-RIGHT HEADER BUTTONS — MEMORY / SHOP / RESET
// ═══════════════════════════════════════════════════════════════════════════

function HeaderButtons({ onReset, isMobile }) {
  const btns = [
    { label: 'MEMORY', color: '#f5a623', textColor: '#2d2d2d' },
    { label: 'SHOP',   color: '#8b2635', textColor: '#f5e6c8' },
    { label: 'RESET',  color: '#3a3a3a', textColor: '#f5e6c8' },
  ]
  return (
    <div style={{
      position: 'absolute',
      top: 14,
      right: isMobile ? 14 : 252,
      zIndex: 20,
      display: 'flex',
      gap: 8,
    }}>
      {btns.map(({ label, color, textColor }) => (
        <div key={label} style={{ position:'relative' }}>
          {/* Filtered button bg */}
          <div style={{
            position:'absolute', inset:0,
            background:color,
            border:'3px solid #2d2d2d',
            boxShadow:'3px 3px 0 0 #2d2d2d',
            borderRadius:R1,
            filter:'url(#micro-warp)',
          }} />
          <button
            onClick={label === 'RESET' ? onReset : undefined}
            style={{
              position:'relative', zIndex:2,
              background:'transparent', border:'none',
              padding:'10px 20px',
              fontFamily:'"Luckiest Guy",cursive',
              fontSize:15, color:textColor,
              letterSpacing:2,
              textShadow: textColor === '#2d2d2d' ? 'none' : '1px 1px 0 #2d2d2d',
              cursor: C.pointer,
            }}
          >
            {label}
          </button>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DECORATIVE STICKERS — floating badge-style labels
// ═══════════════════════════════════════════════════════════════════════════

function Stickers() {
  const items = [
    {
      text: "BARK WITH\nTHE BITE",
      style: { top: '12%', left: '22%' },
      rotate: 0,
      bg: '#f5e6c8',
      borderColor: '#f5a623',
      textColor: '#8b2635',
    },
    {
      text: 'MOGI\nEXISTS.',
      style: { top: '34%', left: '11%' },
      rotate: -6,
      bg: '#1a2744',
      borderColor: '#f5a623',
      textColor: '#f5a623',
    },
  ]

  return (
    <>
      {items.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...s.style,
            zIndex: 8,
            transform: s.style.transform ? `${s.style.transform} rotate(${s.rotate}deg)` : `rotate(${s.rotate}deg)`,
          }}
        >
          {/* Filtered bg — shape only */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: s.bg,
            border: `5px solid ${s.borderColor}`,
            boxShadow: '5px 5px 0 0 #2d2d2d',
            borderRadius: R1,
            filter: 'url(#micro-warp)',
          }} />
          {/* Unfiltered text */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            padding: '12px 20px',
            fontFamily: '"Luckiest Guy",cursive',
            fontSize: 24,
            color: s.textColor,
            textShadow: '2px 2px 0 rgba(0,0,0,0.4)',
            whiteSpace: 'pre',
            lineHeight: 1.35,
            letterSpacing: 1,
          }}>
            {s.text}
          </div>
        </div>
      ))}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

// ─── Floating drag clone rendered at pointer position ────────────────────────
function DragClone({ item, x, y, isMobile }) {
  if (!item) return null
  return (
    <div style={{
      position: 'fixed',
      left: x - (isMobile ? 55 : 90),
      top: y - (isMobile ? 55 : 90),
      width: isMobile ? 110 : 180,
      height: isMobile ? 110 : 180,
      pointerEvents: 'none',
      zIndex: 9999,
      transform: `rotate(-6deg) scale(${1.05 * (item.scale || 1)})`,
      transition: 'none',
    }}>
      {item.image ? (
        <img 
          src={item.image} 
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(6px 10px 4px rgba(0,0,0,0.3))'
          }}
        />
      ) : (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: item.color,
            border: '4px solid #2d2d2d',
            boxShadow: `0 0 0 3px ${item.accent}, 8px 12px 0 0 rgba(45,45,45,0.8)`,
            borderRadius: R1,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 4, pointerEvents: 'none',
          }}>
            <div style={{ width: '50%', height: 6, background: item.accent, border: '2px solid #2d2d2d', borderRadius: 2 }} />
            <span style={{
              fontFamily: '"Balsamiq Sans", cursive',
              fontSize: 24, fontWeight: 700,
              color: item.accent, textAlign: 'center',
              lineHeight: 1.15, padding: '0 6px',
              textShadow: '1px 1px 0 rgba(0,0,0,0.85)',
              wordBreak: 'break-word', maxWidth: '95%',
            }}>{item.name}</span>
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [equipped, setEquipped] = useState({ head: null, top: null, bottom: null })
  const [dragOver, setDragOver]   = useState(false)
  const [dragState, setDragState] = useState(null) // { item, x, y }
  const dollRef = useRef(null)
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 800)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePointerDragStart = useCallback((e, item) => {
    // Only activate on left button / touch
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    // NOTE: do NOT call setPointerCapture here — it routes all subsequent
    // pointer events to the source element and breaks the window listeners.
    setDragState({ item, x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    if (!dragState) return

    function getPos(e) {
      // Support both mouse and touch events
      if (e.clientX !== undefined) return { x: e.clientX, y: e.clientY }
      const t = e.touches?.[0] ?? e.changedTouches?.[0]
      return t ? { x: t.clientX, y: t.clientY } : { x: 0, y: 0 }
    }

    function isOverDoll(x, y) {
      if (!dollRef.current) return false
      const rect = dollRef.current.getBoundingClientRect()
      // The character div has transform: scale(1.5) with transformOrigin:'bottom center'.
      // getBoundingClientRect() already accounts for CSS transforms, so the rect
      // reflects the actual painted area. Add generous padding for usability.
      const px = 60
      const py = 60
      return (
        x >= rect.left - px && x <= rect.right  + px &&
        y >= rect.top  - py && y <= rect.bottom + py
      )
    }

    function onMove(e) {
      if (e.cancelable !== false) {
        e.preventDefault()
      }
      const { x, y } = getPos(e)
      setDragState(prev => ({ ...prev, x, y }))
      setDragOver(isOverDoll(x, y))
    }

    function onUp(e) {
      const { x, y } = getPos(e)

      if (dragState.item && isOverDoll(x, y)) {
        const slot = getSlot(dragState.item)
        setEquipped(prev => ({
          ...prev,
          [slot]: prev[slot]?.id === dragState.item.id ? null : dragState.item,
        }))
      }

      setDragState(null)
      setDragOver(false)
    }

    // Use capture phase so we receive events even if a child element
    // called stopPropagation or setPointerCapture somewhere.
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup',   onUp,   true)
    window.addEventListener('touchmove',   onMove, { passive: false, capture: true })
    window.addEventListener('touchend',    onUp,   true)
    return () => {
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup',   onUp,   true)
      window.removeEventListener('touchmove',   onMove, true)
      window.removeEventListener('touchend',    onUp,   true)
    }
  }, [dragState])

  function handleClickItem(item) {
    const slot = getSlot(item)
    setEquipped(prev => ({
      ...prev,
      [slot]: prev[slot]?.id === item.id ? null : item,
    }))
  }

  function handleUnequip(slot) {
    setEquipped(prev => ({ ...prev, [slot]: null }))
  }

  function handleReset() {
    setEquipped({ head: null, top: null, bottom: null })
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#c2d6a4',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Balsamiq Sans", cursive',
        cursor: dragState ? C.grabbing : C.default,
        touchAction: dragState ? 'none' : 'auto',
      }}
    >
      <SvgDefs />
      <PaperOverlay />
      <Floor />
      {!isMobile && <BackWindow />}
      <LogoBlob />
      <CharacterDoll
        dollRef={dollRef}
        equipped={equipped}
        dragOver={dragOver}
        isMobile={isMobile}
        onUnequip={handleUnequip}
      />
      <Wardrobe
        items={[
          ...INVENTORY.headwear,
          ...INVENTORY.tops,
          ...INVENTORY.bottoms
        ]}
        equipped={equipped}
        isDragging={!!dragState}
        isMobile={isMobile}
        onPointerDragStart={handlePointerDragStart}
        onClick={handleClickItem}
      />
      <HeaderButtons onReset={handleReset} isMobile={isMobile} />
      {!isMobile && <Stickers />}
      <DragClone item={dragState?.item} x={dragState?.x} y={dragState?.y} isMobile={isMobile} />
    </div>
  )
}
