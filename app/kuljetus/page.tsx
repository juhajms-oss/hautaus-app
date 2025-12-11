'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function KuljetusSivu() {
  const router = useRouter()
  const [yritys, setYritys] = useState('')
  const [keikat, setKeikat] = useState<any[]>([])
  const [valittuKeikka, setValittuKeikka] = useState<any>(null)
  const [ladataan, setLadataan] = useState(true)

  // Kalenterin tilat
  const [nykyinenPvm, setNykyinenPvm] = useState(new Date())

  useEffect(() => {
    const savedSession = localStorage.getItem('hautaus_session')
    if (savedSession) {
      const session = JSON.parse(savedSession)
      if (session.role === 'kuljetus' && session.company_name) {
        setYritys(session.company_name)
        haeKeikat(session.company_name)
      } else {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [])

  async function haeKeikat(firma: string) {
    const { data } = await supabase
      .from('resource_bookings')
      .select('*, arrangements ( deceased_name, ssn, place_of_death )')
      .eq('provider_name', firma)
      .order('booking_time', { ascending: true })
    
    setKeikat(data || [])
    setLadataan(false)
  }

  const kirjauduUlos = () => { localStorage.removeItem('hautaus_session'); router.push('/') }

  // --- KALENTERILOGIIKKA ---
  const kuukaudet = ['Tammikuu','Helmikuu','Maaliskuu','Huhtikuu','Toukokuu','Kesäkuu','Heinäkuu','Elokuu','Syyskuu','Lokakuu','Marraskuu','Joulukuu']
  const viikonpaivat = ['Ma','Ti','Ke','To','Pe','La','Su']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const days = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay() // 0 = Su, 1 = Ma...
    // Muutetaan niin että Ma = 0, Su = 6
    const startDay = firstDay === 0 ? 6 : firstDay - 1
    return { days, startDay }
  }

  const { days, startDay } = getDaysInMonth(nykyinenPvm)
  
  const vaihdaKuukautta = (suunta: number) => {
    setNykyinenPvm(new Date(nykyinenPvm.getFullYear(), nykyinenPvm.getMonth() + suunta, 1))
  }

  // Etsi keikat tietylle päivälle
  const haeKeikatPaivalle = (day: number) => {
    return keikat.filter(k => {
        if (!k.booking_time) return false
        const d = new Date(k.booking_time)
        return d.getDate() === day && d.getMonth() === nykyinenPvm.getMonth() && d.getFullYear() === nykyinenPvm.getFullYear()
    })
  }

  if (ladataan) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Ladataan kalenteria...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col h-screen overflow-hidden">
      
      {/* YLÄPALKKI */}
      <header className="bg-white p-4 shadow-sm border-b border-slate-200 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-800 text-white rounded-lg flex items-center justify-center font-bold text-lg">K</div>
            <div>
                <h1 className="font-bold text-lg text-slate-900 leading-tight">{yritys}</h1>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Ajojärjestely</p>
            </div>
        </div>
        <button onClick={kirjauduUlos} className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 bg-slate-50 rounded transition">KIRJAUDU ULOS</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- VASEN SIVUPALKKI (LISTA) --- */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col z-10 shrink-0 h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tulevat tehtävät</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {keikat.length === 0 && <p className="p-6 text-center text-sm text-slate-400 italic">Ei tulevia ajoja.</p>}
                {keikat.map(k => {
                    const date = k.booking_time ? new Date(k.booking_time) : null
                    const isSelected = valittuKeikka?.id === k.id
                    return (
                        <div 
                            key={k.id}
                            onClick={() => setValittuKeikka(k)}
                            className={`p-4 border-b border-slate-50 cursor-pointer transition hover:bg-slate-50 ${isSelected ? 'bg-slate-100 border-l-4 border-l-slate-800' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                    {date ? date.toLocaleDateString('fi-FI') : 'Avoin'}
                                </span>
                                <span className="text-xs font-bold text-slate-900">{date ? date.toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm truncate">{k.arrangements?.deceased_name}</h3>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                                {k.resource_type === 'Kuljetus' ? `${k.location_from} ➝ ${k.location_to}` : k.notes || k.resource_type}
                            </p>
                        </div>
                    )
                })}
            </div>
        </aside>

        {/* --- KESKIALUE (KALENTERI) --- */}
        <main className="flex-1 bg-slate-50 p-6 overflow-y-auto">
            
            {/* Kalenterin otsikko ja navigaatio */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-slate-400">📅</span> {kuukaudet[nykyinenPvm.getMonth()]} {nykyinenPvm.getFullYear()}
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => vaihdaKuukautta(-1)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold">←</button>
                    <button onClick={() => setNykyinenPvm(new Date())} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold text-sm">TÄNÄÄN</button>
                    <button onClick={() => vaihdaKuukautta(1)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold">→</button>
                </div>
            </div>

            {/* Kalenterigrid */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Viikonpäivät */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {viikonpaivat.map(d => (
                        <div key={d} className="py-3 text-center text-xs font-bold text-slate-400 uppercase">{d}</div>
                    ))}
                </div>
                
                {/* Päivät */}
                <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                    {/* Tyhjät alussa */}
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-slate-50/50 min-h-[120px]"></div>
                    ))}

                    {/* Kuukauden päivät */}
                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1
                        const dayTasks = haeKeikatPaivalle(day)
                        const isToday = new Date().getDate() === day && new Date().getMonth() === nykyinenPvm.getMonth()

                        return (
                            <div key={day} className={`bg-white min-h-[120px] p-2 transition hover:bg-slate-50/80 ${isToday ? 'bg-blue-50/30' : ''}`}>
                                <div className={`text-sm font-bold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>
                                    {day}
                                </div>
                                <div className="space-y-1">
                                    {dayTasks.map(task => (
                                        <button 
                                            key={task.id}
                                            onClick={() => setValittuKeikka(task)}
                                            className={`w-full text-left text-[10px] px-2 py-1.5 rounded border shadow-sm truncate font-medium transition active:scale-95
                                                ${task.resource_type === 'Kuljetus' ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-amber-50 text-amber-800 border-amber-100'}
                                            `}
                                        >
                                            {new Date(task.booking_time).toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'})} {task.arrangements?.deceased_name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </main>
      </div>

      {/* --- MODAL: TEHTÄVÄN TIEDOT --- */}
      {valittuKeikka && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setValittuKeikka(null)}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                    <div>
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 block">Ajomääräys</span>
                        <h2 className="text-2xl font-serif font-bold">{valittuKeikka.arrangements?.deceased_name}</h2>
                        <p className="text-slate-400 text-sm mt-1 opacity-80">Sotu: {valittuKeikka.arrangements?.ssn || '-'}</p>
                    </div>
                    <button onClick={() => setValittuKeikka(null)} className="text-slate-400 hover:text-white text-2xl font-bold leading-none">×</button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    
                    {/* Aika ja Tyyppi */}
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-100 rounded-lg p-3 text-center min-w-[80px]">
                            <p className="text-xs font-bold text-slate-500 uppercase">{valittuKeikka.booking_time ? new Date(valittuKeikka.booking_time).toLocaleDateString('fi-FI', {weekday:'short'}) : ''}</p>
                            <p className="text-xl font-bold text-slate-800">{valittuKeikka.booking_time ? new Date(valittuKeikka.booking_time).getDate() : ''}</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{valittuKeikka.booking_time ? new Date(valittuKeikka.booking_time).toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'}) : 'Avoin'}</p>
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase">{valittuKeikka.resource_type}</span>
                        </div>
                    </div>

                    {/* Kuljetusreitti */}
                    {valittuKeikka.resource_type === 'Kuljetus' ? (
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                                {/* Pallo 1 */}
                                <div className="absolute -left-[9px] top-0 w-4 h-4 bg-slate-400 rounded-full border-2 border-white"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Haku (Mistä)</p>
                                    <p className="font-bold text-slate-800 text-lg">{valittuKeikka.location_from || '-'}</p>
                                    {valittuKeikka.location_from && (
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(valittuKeikka.location_from)}`} target="_blank" className="inline-block mt-2 text-blue-600 text-xs font-bold border border-blue-100 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100">
                                            AVAA KARTTA ↗
                                        </a>
                                    )}
                                </div>

                                {/* Pallo 2 */}
                                <div className="absolute -left-[9px] top-full w-4 h-4 bg-slate-800 rounded-full border-2 border-white -translate-y-4"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Vienti (Mihin)</p>
                                    <p className="font-bold text-slate-800 text-lg">{valittuKeikka.location_to || '-'}</p>
                                    {valittuKeikka.location_to && (
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(valittuKeikka.location_to)}`} target="_blank" className="inline-block mt-2 text-blue-600 text-xs font-bold border border-blue-100 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100">
                                            AVAA KARTTA ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Paikka / Toimittaja</p>
                            <p className="font-bold text-slate-800">{valittuKeikka.provider_name}</p>
                            {valittuKeikka.headcount && <p className="mt-2 text-sm"><span className="font-bold">Henkilömäärä:</span> {valittuKeikka.headcount}</p>}
                            {valittuKeikka.menu_details && <p className="mt-1 text-sm italic">{valittuKeikka.menu_details}</p>}
                        </div>
                    )}

                    {/* Lisätiedot */}
                    {valittuKeikka.notes && (
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-900">
                            <p className="font-bold uppercase text-[10px] text-yellow-600 mb-1">Huomioitavaa</p>
                            <p>"{valittuKeikka.notes}"</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button onClick={() => setValittuKeikka(null)} className="text-slate-500 font-bold text-sm hover:text-slate-800">SULJE</button>
                </div>
            </div>
        </div>
      )}

    </div>
  )
}