import type { PersonaId } from './engine';

export type CharacterMood = 'ready' | 'thinking' | 'speaking' | 'listening' | 'happy' | 'thoughtful' | 'annoyed' | 'sad';
export type Biome = 'meadow' | 'woodland' | 'riverside' | 'highlands';

// Original vector artwork. No definitions/IDs: any number of portraits can coexist.
const ink = '#303c35';
const cream = '#fff2d6';
const palettes = {
  maya: { fur: '#edba59', shadow: '#ce8c3e', light: '#f9d98c', accent: '#537b62' },
  leo: { fur: '#df7848', shadow: '#b65137', light: '#f29a60', accent: '#678e99' },
  sam: { fur: '#82938c', shadow: '#586f67', light: '#a6b4a2', accent: '#c88a53' },
};

function AnimalEyes({ mood, owl }: { mood: CharacterMood; owl: boolean }) {
  const sad = mood === 'sad';
  const annoyed = mood === 'annoyed';
  const thinking = mood === 'thinking';
  const thoughtful = mood === 'thoughtful';
  const gazeX = thinking ? 3 : thoughtful ? -3 : mood === 'listening' ? 2 : 0;
  const gazeY = thinking ? -4 : sad ? 4 : 0;
  return <>
    <g className="character-eyes">
      {[94, 146].map((x) => <g key={x}>
        <ellipse cx={x} cy="89" rx={owl ? 22 : 17} ry={owl ? 25 : 23} fill="#fffdf4" />
        {mood === 'happy' ? <path d={`M${x - 9} 91Q${x} 77 ${x + 9} 91`} stroke={ink} strokeWidth="5" strokeLinecap="round" /> : <>
          <ellipse cx={x + gazeX} cy={90 + gazeY} rx={owl ? 11 : 9} ry={owl ? 15 : 13} fill={ink} />
          <ellipse cx={x + gazeX - 3} cy={85 + gazeY} rx="3.5" ry="4" fill="#fffdf4" />
          <circle cx={x + gazeX + 4} cy={96 + gazeY} r="1.8" fill="#fffdf4" opacity=".65" />
        </>}
      </g>)}
      {annoyed && <path d="M75 65L113 81L113 65ZM127 65V81L165 65Z" fill={owl ? palettes.sam.fur : cream} />}
      {sad && <path d="M75 68L111 64L111 77Q91 83 75 80ZM129 64L165 68V80Q148 83 129 77Z" fill={owl ? palettes.sam.fur : cream} />}
    </g>
    <path d={annoyed ? 'M77 66L109 78M131 78L163 66' : sad ? 'M78 65Q94 65 108 57M132 57Q147 65 162 65' : thinking ? 'M78 61Q93 52 108 60M133 62L161 66' : thoughtful ? 'M79 65L106 62M133 60Q149 54 161 61' : mood === 'listening' ? 'M78 58Q94 51 108 57M132 57Q148 51 162 58' : 'M79 61Q93 56 106 61M134 61Q148 56 161 61'} stroke={ink} strokeWidth="4" strokeLinecap="round" />
  </>;
}

function AnimalMouth({ mood, owl }: { mood: CharacterMood; owl: boolean }) {
  if (owl) return <g className="character-mouth" style={{ animation: 'none' }} transform={mood === 'sad' ? 'translate(0 2)' : undefined}>
    {/* Both halves share the same hinge; only the lower mandible opens. */}
    {mood === 'speaking' && <path d="M110 111L120 134L130 111Z" fill="#87552f" />}
    <path d={mood === 'speaking' ? 'M110 111Q120 139 130 111L120 134Z' : 'M110 111Q120 125 130 111L120 125Z'} fill="#ce8c3e" />
    <path d="M110 111Q120 99 130 111L120 122Z" fill="#edba59" />
    <path d="M120 105L130 111L120 122Z" fill="#dfa547" />
    <path d="M115 109L119 106" stroke="#ffe0a0" strokeWidth="2" strokeLinecap="round" />
  </g>;
  return <>
    <path d="M109 112Q120 107 131 112Q131 119 120 123Q109 119 109 112Z" fill={ink} />
    <path d="M115 113H120" stroke="#647267" strokeWidth="2.5" strokeLinecap="round" />
    <g className="character-mouth">
      {mood === 'speaking' ? <><path d="M108 128Q120 124 132 128Q135 148 120 149Q105 148 108 128Z" fill={ink} /><path d="M112 143Q120 137 128 143Q120 151 112 143Z" fill="#e68c7b" /></> : mood === 'happy' ? <><path d="M101 126Q120 135 139 126Q138 151 120 153Q102 151 101 126Z" fill={ink} /><path d="M106 129Q120 134 134 129L131 136H109Z" fill="#fffdf4" /><path d="M110 148Q120 139 130 148Q120 154 110 148Z" fill="#e68c7b" /></> : <path d={mood === 'sad' ? 'M108 139Q120 128 132 139' : mood === 'annoyed' ? 'M109 134H132' : mood === 'thinking' ? 'M114 135Q122 138 129 132' : mood === 'thoughtful' ? 'M109 133Q119 138 128 133' : 'M120 123V128M102 128Q110 140 120 128Q130 140 138 128'} stroke={ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  </>;
}

export function Character({ person, mood = 'ready', portrait = false, talking = false }: { person: PersonaId; mood?: CharacterMood; portrait?: boolean; talking?: boolean }) {
  const dog = person === 'maya';
  const owl = person === 'sam';
  const colors = palettes[person];
  const sad = mood === 'sad';
  const quiet = sad || mood === 'annoyed' || mood === 'thoughtful' || mood === 'thinking';
  const headTilt = sad ? 'rotate(5 120 143)' : mood === 'listening' ? 'rotate(-6 120 143)' : mood === 'thinking' ? 'rotate(4 120 143)' : undefined;

  return <svg className={`character character-${person} mood-${mood} ${talking ? 'mood-speaking' : ''} ${portrait ? 'character-portrait' : ''}`} viewBox={portrait ? '26 6 188 177' : '0 0 240 310'} fill="none" aria-hidden="true" focusable="false">
    {!portrait && <ellipse cx="120" cy="290" rx="72" ry="10" fill={ink} opacity=".12" />}
    <g className="character-body">
      {!portrait && <>
        {/* Species-specific tails sit behind grounded, short-legged bodies. */}
        {dog ? <path d={sad ? 'M158 225Q198 251 181 274Q168 280 169 266Q177 253 149 247Z' : 'M157 225Q194 225 193 190Q194 179 202 184Q226 228 180 248L157 247Z'} fill={colors.shadow} /> : !owl ? <>
          <path d={sad ? 'M147 230Q199 200 219 250Q226 280 199 285Q164 289 140 253Z' : 'M146 226Q174 220 183 195Q193 169 216 167Q201 185 221 209Q239 235 215 256Q183 281 146 251Z'} fill={colors.shadow} />
          <path d={sad ? 'M210 237Q232 267 213 281Q200 290 185 281L191 268L201 267L198 251Z' : 'M183 195Q193 169 216 167Q201 185 221 209L207 206L204 219L192 208L181 212Z'} fill={cream} />
        </> : <path d="M88 248L98 279L118 263L138 280L154 246Z" fill={colors.shadow} />}

        {dog && <><path d="M67 158Q53 159 52 181V225Q52 236 69 237L90 228V166Z" fill={colors.accent} /><path d="M55 190H72V217H55" fill="#3b614c" /><path d="M62 173V183" stroke="#bbd3a7" strokeWidth="4" strokeLinecap="round" /></>}
        {owl ? <>
          <path d="M95 260L93 281M143 261L148 281" stroke="#ce8c3e" strokeWidth="11" strokeLinecap="round" />
          <path d="M76 288Q79 278 94 278Q108 278 109 288ZM133 288Q133 278 147 278Q165 278 169 288Z" fill="#edba59" />
          <path d="M88 284V289M98 284V289M145 284V289M155 284V289" stroke="#b77838" strokeWidth="2.5" strokeLinecap="round" />
        </> : <>
          <path d="M81 236L78 272Q66 273 66 284Q65 292 82 292H100Q110 291 109 280L111 239ZM128 239L132 280Q129 292 143 292H164Q178 291 174 282Q172 274 161 272L157 235Z" fill={dog ? colors.fur : '#654c42'} />
          <path d="M79 283V289M89 283V289M147 283V289M157 283V289" stroke={dog ? colors.shadow : '#493f38'} strokeWidth="2.5" strokeLinecap="round" />
        </>}
        <path d={owl ? 'M74 143Q49 174 59 225Q65 268 118 273Q170 274 183 231Q196 184 167 143Z' : 'M88 143Q69 166 70 214L76 250Q116 269 166 249L169 210Q166 165 150 144Z'} fill={colors.fur} />
        <path d={owl ? 'M116 159Q157 158 164 205Q174 253 121 258Q76 255 79 212Q81 173 116 159Z' : 'M111 156Q140 146 151 180L154 230Q123 248 91 230L92 186Q94 165 111 156Z'} fill={owl ? '#dbe0c5' : cream} />
        {owl && <path d="M99 183L105 189L111 183M125 180L131 186L137 180M112 203L118 209L124 203M95 223L101 229L107 223M135 222L141 228L147 222" stroke="#a6b4a2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {dog && <><path d="M85 148Q75 179 83 217" stroke={colors.accent} strokeWidth="10" strokeLinecap="round" /><path d="M88 171L87 186" stroke="#bbd3a7" strokeWidth="3" strokeLinecap="round" /></>}
        {owl ? <>
          <g transform="rotate(-9 126 220)"><rect x="102" y="191" width="55" height="60" rx="6" fill={colors.accent} /><path d="M112 192V250" stroke="#f7dab0" strokeWidth="3" /><path d="M120 203H146M120 211H139" stroke={cream} strokeWidth="3" strokeLinecap="round" /><path d="M147 235V255L142 251L137 255V235" fill="#537b62" /></g>
          <path d="M72 158Q49 170 57 213Q67 233 111 227Q118 222 109 218L94 210Q108 211 108 205Q83 194 82 175Z" fill={colors.shadow} />
          <path d="M68 191Q68 212 89 216" stroke={colors.light} strokeWidth="3" strokeLinecap="round" />
        </> : <path d="M80 164Q56 180 65 207Q68 220 82 216Q91 210 83 197L93 177Z" fill={colors.shadow} />}
        <g className="character-arm" style={quiet || owl ? { animation: 'none' } : undefined}>
          {owl ? <><path d="M164 159Q186 170 180 215Q174 235 150 236Q137 232 146 224L158 211Q148 216 144 210Q161 190 157 172Z" fill={colors.shadow} /><path d="M171 189Q172 207 159 221" stroke={colors.light} strokeWidth="3" strokeLinecap="round" /></> : quiet ? <path d="M158 164Q181 180 173 215Q168 225 157 219Q150 214 157 198L146 179Z" fill={colors.fur} /> : <>
            <path d="M158 165Q170 187 187 169L197 143" stroke={colors.fur} strokeWidth="22" strokeLinecap="round" />
            <path d="M184 142Q179 129 186 126Q191 122 194 133Q193 114 201 116Q207 118 204 132Q210 119 215 125Q220 132 211 147Q199 160 189 151Z" fill={colors.fur} />
            <ellipse cx="199" cy="142" rx="6" ry="7" fill={dog ? colors.shadow : '#654c42'} />
          </>}
        </g>
      </>}

      {/* Accessories remain visible at the lower edge of the portrait crop. */}
      {dog ? <><path d="M79 145Q119 162 160 145L157 163Q120 178 82 161Z" fill={colors.accent} /><path d="M120 164L128 173L120 182L112 173Z" fill={cream} /></> : !owl ? <><path d="M141 153L157 158L170 204L151 201L147 208L134 164Z" fill={colors.accent} /><path d="M79 143Q119 158 161 141L164 160Q123 182 80 160Z" fill="#8fb3b6" /><path d="M87 159Q113 169 139 161M150 191L164 187" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" /></> : <path d="M98 151Q119 163 142 151L133 169L120 163L107 169Z" fill={colors.shadow} />}

      <g className="character-head" transform={headTilt}>
        {dog ? <>
          <path d={sad ? 'M73 52Q39 52 43 97L43 138Q47 160 63 151Q79 140 82 97ZM167 52Q201 52 197 97L197 138Q193 160 177 151Q161 140 158 97Z' : 'M77 48Q48 40 40 70Q32 96 45 128Q53 140 64 127L88 77ZM165 48Q194 43 201 73Q211 100 195 125Q183 136 176 119L152 72Z'} fill={colors.shadow} />
          <path d="M62 84Q57 102 56 117M183 82Q191 98 187 113" stroke="#e1a350" strokeWidth="7" strokeLinecap="round" />
          <path d="M57 88Q54 43 93 33L111 30L105 21Q124 19 133 31Q167 29 180 61Q189 84 181 113Q179 152 122 162Q66 157 59 127Z" fill={colors.fur} />
          <path d="M94 42Q113 35 132 43" stroke={colors.light} strokeWidth="8" strokeLinecap="round" />
          <path d="M79 108Q88 99 105 107Q120 100 136 107Q152 101 163 111Q176 135 152 149Q119 165 89 147Q66 133 79 108Z" fill={cream} />
        </> : !owl ? <>
          <path d={sad ? 'M66 79Q40 49 42 29Q72 28 97 58ZM146 57Q174 28 199 31Q199 58 174 80Z' : 'M61 80Q48 43 61 10Q93 23 105 60ZM139 58Q154 20 182 10Q196 47 178 83Z'} fill={colors.shadow} />
          <path d={sad ? 'M64 63L53 40L81 52ZM161 54L187 42L177 65Z' : 'M67 30L72 70L91 59ZM173 30L151 58L172 70Z'} fill="#f3b38d" />
          <path d="M64 63Q87 40 120 46Q153 39 177 66L187 99L199 108L183 114L188 124L169 126Q151 152 120 163Q91 153 71 128L51 125L58 114L43 106L56 99Z" fill={colors.fur} />
          <path d="M67 98Q91 97 120 116Q148 97 174 98L183 115L169 118L174 125Q146 153 120 163Q91 151 66 126L72 118L57 114Z" fill={cream} />
          <path d="M108 52L121 67L132 51" fill={colors.light} />
        </> : <>
          <path d={sad ? 'M61 71L44 38L82 45Q120 29 159 44L194 38L178 73Q193 99 178 133Q163 162 121 166Q78 166 61 136Q43 109 61 71Z' : 'M59 72L51 19L84 39Q120 26 155 39L190 19L180 75Q195 107 177 138Q159 164 120 166Q78 165 61 136Q44 111 59 72Z'} fill={colors.fur} />
          <path d="M67 43L78 57L67 62ZM172 43L162 57L174 62Z" fill={colors.light} />
          <path d="M120 63Q103 43 78 56Q53 72 63 105Q68 132 120 154Q171 134 178 106Q188 74 163 57Q138 42 120 63Z" fill={cream} />
          <path d="M110 39L120 50L131 39L126 58H115Z" fill={colors.shadow} />
        </>}
        <AnimalEyes mood={mood} owl={owl} />
        <ellipse cx={owl ? 77 : 76} cy="115" rx="9" ry="5" fill="#e69a78" opacity={sad || mood === 'annoyed' ? '.25' : '.55'} />
        <ellipse cx={owl ? 163 : 164} cy="115" rx="9" ry="5" fill="#e69a78" opacity={sad || mood === 'annoyed' ? '.25' : '.55'} />
        <AnimalMouth mood={talking ? 'speaking' : mood} owl={owl} />
        {dog && <><circle cx="90" cy="121" r="1.8" fill={colors.shadow} /><circle cx="96" cy="125" r="1.8" fill={colors.shadow} /><circle cx="150" cy="121" r="1.8" fill={colors.shadow} /><circle cx="144" cy="125" r="1.8" fill={colors.shadow} /></>}
      </g>
    </g>
  </svg>;
}

function SceneTree({ x, y, scale = 1, pine = false }: { x: number; y: number; scale?: number; pine?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {pine ? <><path d="M0 -166L-37 -106H-22L-53 -53H-29L-62 -5H62L30 -53H52L23 -106H38Z" fill="currentColor" fillOpacity=".09" /><path d="M0 -166L-37 -106H-22L-53 -53H-29L-62 -5H62L30 -53H52L23 -106H38Z" /></> : <><path d="M-43 -52Q-82 -64 -64 -100Q-80 -135 -44 -147Q-39 -183 -8 -177Q26 -198 43 -163Q80 -165 77 -128Q100 -101 72 -79Q70 -49 37 -53Q4 -31 -21 -50Z" fill="currentColor" fillOpacity=".08" /><path d="M-43 -52Q-82 -64 -64 -100Q-80 -135 -44 -147Q-39 -183 -8 -177Q26 -198 43 -163Q80 -165 77 -128Q100 -101 72 -79Q70 -49 37 -53" /></>}
    <path d="M0 17V-99M0 -39L-27 -63M0 -65L25 -87" />
  </g>;
}

export function CampusScene({ place, biome = 'meadow' }: { place: string; biome?: Biome }) {
  const library = /library|study/i.test(place);
  return <svg className={`campus-scene biome-${biome}`} viewBox="0 0 800 320" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {biome === 'meadow' && <>
        <path d="M-20 238Q106 183 243 226T493 218T824 226V320H-20Z" fill="currentColor" fillOpacity=".06" stroke="none" />
        <path d="M0 241Q100 207 210 233M553 225Q682 200 800 231M0 285Q149 272 258 281M573 283Q690 270 800 283" />
        <path d="M327 320Q268 277 348 252Q415 231 472 228M443 320Q351 279 405 256Q435 244 490 236" opacity=".6" />
        <SceneTree x={704} y={233} scale={.7} />
        <SceneTree x={28} y={244} scale={.95} /><SceneTree x={130} y={226} scale={.5} />
        {[{ x: 51, y: 276 }, { x: 119, y: 244 }, { x: 620, y: 269 }, { x: 755, y: 290 }].map(({ x, y }) => <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M0 0V-21M0 -7Q-13 -19 -15 -8Q-9 -4 0 -4M0 -11Q12 -24 15 -13Q8 -8 0 -8" />
          <path d="M0 -23C-17 -17 -17 -34 -7 -33C-12 -46 8 -46 6 -33C19 -38 20 -19 7 -23C12 -10 -6 -10 0 -23Z" fill="currentColor" fillOpacity=".1" />
          <circle cy="-28" r="3" fill="currentColor" stroke="none" />
        </g>)}
        <path d="M182 276L178 262M182 276L190 267M566 298L558 283M566 298L573 281" />
      </>}
      {biome === 'woodland' && <>
        <path d="M0 267Q163 230 292 259T567 253T800 266V320H0Z" fill="currentColor" fillOpacity=".07" stroke="none" />
        <SceneTree x={38} y={248} scale={1.25} /><SceneTree x={172} y={227} scale={.8} />
        <SceneTree x={687} y={250} scale={1.3} /><SceneTree x={789} y={225} scale={.85} pine />
        <path d="M311 320Q266 280 326 262L491 241M427 320Q357 284 416 267L511 249" opacity=".6" />
        <path d="M53 290Q58 260 84 260M58 280L47 270M63 273L60 260M69 267L76 275M721 294Q708 267 725 252M716 278L702 273M716 269L730 269" />
        <path d="M147 291V277M130 277Q147 246 164 277ZM179 299V290M169 290Q179 270 190 290Z" fill="currentColor" fillOpacity=".08" />
        <path d="M612 284Q628 274 644 284M229 286L239 282M654 308L668 305" />
      </>}
      {biome === 'riverside' && <>
        <path d="M0 234Q135 202 247 237Q391 280 550 230Q677 192 800 226M0 270Q147 231 252 265Q403 311 553 263Q689 223 800 261" />
        <path d="M0 235Q135 203 247 238Q391 281 550 231Q677 193 800 227V260Q689 222 553 262Q403 310 252 264Q147 230 0 269Z" fill="currentColor" fillOpacity=".11" stroke="none" />
        <path d="M93 248H134M278 263H309M465 278H502M662 241H695M704 250H744" opacity=".65" />
        <path d="M509 235Q561 184 626 216L624 230Q563 206 521 247ZM510 234V205Q562 156 628 192V216M529 215V191M552 202V178M578 199V175M604 203V181" />
        <path d="M49 294V236M63 296V249M49 275Q32 258 30 239M65 281Q77 260 79 245M747 292V230M765 293V244M747 271L729 250M765 281L783 254" />
        <path d="M49 233V218M63 247V234M747 228V210M765 242V226" strokeWidth="7" />
        <path d="M190 300Q201 284 216 294Q231 284 241 300ZM677 301Q690 284 708 301Z" fill="currentColor" fillOpacity=".1" />
        <SceneTree x={149} y={217} scale={.65} />
      </>}
      {biome === 'highlands' && <>
        <path d="M-40 245L116 58L223 177L330 34L480 219L601 72L827 256V320H-40Z" fill="currentColor" fillOpacity=".07" stroke="none" />
        <path d="M-20 226L116 58L223 177L330 34L480 219L601 72L818 246" opacity=".7" />
        <path d="M81 101L112 115L133 99L153 103M288 87L319 100L340 78L377 93M562 122L591 133L613 112L637 114" opacity=".7" />
        <path d="M0 277Q145 203 288 267Q427 305 548 239Q694 205 800 271M358 320L389 295L353 281L444 264" />
        <SceneTree x={67} y={265} scale={.6} pine /><SceneTree x={731} y={277} scale={.8} pine />
        <path d="M146 290L162 272L187 278L195 292ZM586 289L601 268L625 264L646 289ZM605 268L617 283" fill="currentColor" fillOpacity=".09" />
        <path d="M506 291V232M487 239H540L552 249L540 259H487Z" />
        <path d="M215 78Q228 64 240 78Q252 64 265 78M521 47Q532 36 543 47Q554 36 565 47" opacity=".55" />
      </>}
      {/* A small campus bench anchors every habitat to the same university. */}
      <g transform={biome === 'riverside' ? 'translate(275 181)' : 'translate(245 210)'} opacity=".65">
        <path d="M0 33H83M5 21H77V0H5ZM9 33V49M73 33V49M13 21V33M69 21V33M6 10H76" />
        {library && <path d="M25 29V16L40 18L54 15V28L40 31ZM40 18V31" fill="currentColor" fillOpacity=".12" />}
      </g>
      {biome !== 'highlands' && <><circle cx="553" cy="63" r="21" opacity=".35" /><path d="M260 69Q268 48 286 56Q301 36 320 56Q340 53 345 69ZM431 112Q439 97 451 104Q465 88 481 110" opacity=".3" /></>}
    </g>
  </svg>;
}
