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
  const [nykyinenPvm, setNykyinenPvm] = useState(new Date())

  useEffect(() => {
    const savedSession = localStorage.getItem('hautaus_session')
    if (savedSession) {
      const session = JSON.parse(savedSession)
      
      if (session.role === 'admin') {
        setYritys('Hautaustoimisto (Admin)')
        haeKaikkiHautajaiset()
      } else if (session.role === 'kuljetus' && session.company_name) {
        setYritys(session.company_name)
        haeKaikkiHautajaiset(session.company_name)
      } else {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [])

  async function haeKaikkiHautajaiset(firmaFilter: string | null = null) {
    const { data: arrangements } = await supabase
      .from('arrangements')
      .select('*, resource_bookings(*)') 
      .not('ceremony_date', 'is', null)
      .order('ceremony_date', { ascending: true })

    if (!arrangements) return

    const muokatut = arrangements.map((arr: any) => {
      const kuljetus = arr.resource_bookings.find((r: any) => r.resource_type === 'Kuljetus')
      
      if (firmaFilter && kuljetus?.provider_name !== firmaFilter) return null

      return {
        id: arr.id,
        resId: kuljetus?.id,
        date: arr.ceremony_date, 
        deceased_name: arr.deceased_name,
        location: arr.location_name,
        address: arr.location_address,
        ssn: arr.ssn,
        hasTransport: !!kuljetus,
        transportProvider: kuljetus ? kuljetus.provider_name : null,
        is_own_drive: kuljetus?.provider_name === 'Hautaustoimisto',
        is_completed: kuljetus?.is_completed || false,
        notes: kuljetus ? kuljetus.notes : ''
      }
    }).filter(Boolean)

    setKeikat(muokatut)
    setLadataan(false)
  }

  const merkitseValmiiksi = async () => {
      if (!valittuKeikka.resId) return
      const uusiTila = !valittuKeikka.is_completed
      await supabase.from('resource_bookings').update({ is_completed: uusiTila }).eq('id', valittuKeikka.resId)
      alert(uusiTila ? 'Merkitty valmiiksi!' : 'Palautettu kesken-tilaan.')
      haeKaikkiHautajaiset(yritys === 'Hautaustoimisto (Admin)' ? null : yritys)
      setValittuKeikka(null)
  }

  const kirjauduUlos = () => { localStorage.removeItem('hautaus_session'); router.push('/') }

  // Kalenterifunktiot
  const kuukaudet = ['Tammi','Helmi','Maalis','Huhti','Touko','Kesä','Heinä','Elo','Syys','Loka','Marras','Joulu']
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(); const month = date.getMonth(); const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); const startDay = firstDay === 0 ? 6 : firstDay - 1
    return { days, startDay }
  }
  const { days, startDay } = getDaysInMonth(nykyinenPvm)
  const vaihdaKuukautta = (suunta: number) => setNykyinenPvm(new Date(nykyinenPvm.getFullYear(), nykyinenPvm.getMonth() + suunta, 1))
  const haeKeikatPaivalle = (day: number) => {
    return keikat.filter(k => {
        const d = new Date(k.date)
        return d.getDate() === day && d.getMonth() === nykyinenPvm.getMonth() && d.getFullYear() === nykyinenPvm.getFullYear()
    })
  }

  if (ladataan) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Ladataan...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col h-screen overflow-hidden">
      <header className="bg-white p-4 shadow-sm border-b border-slate-200 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-800 text-white rounded-lg flex items-center justify-center font-bold text-lg">K</div><div><h1 className="font-bold text-lg text-slate-900 leading-tight">{yritys}</h1><p className="text-xs text-slate-500 uppercase tracking-wider">Ajojärjestely</p></div></div>
        <button onClick={kirjauduUlos} className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 bg-slate-50 rounded transition">ULOS</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col z-10 shrink-0 h-full hidden md:flex">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tulevat siunaukset</h2></div>
            <div className="flex-1 overflow-y-auto">
                {keikat.map(k => {
                    const displayDate = new Date(k.date)
                    let borderClass = 'border-l-red-500' // Ei kuljetusta
                    if (k.hasTransport) {
                         if (k.is_completed) borderClass = 'border-l-gray-400' // Valmis
                         else if (k.is_own_drive) borderClass = 'border-l-violet-500' // Oma ajo
                         else borderClass = 'border-l-emerald-500' // Ulkopuolinen
                    }

                    return (
                        <div key={k.id} onClick={() => setValittuKeikka(k)} className={`p-4 border-b border-slate-50 cursor-pointer transition hover:bg-slate-50 border-l-4 ${borderClass} ${k.is_completed ? 'opacity-50' : ''}`}>
                            <div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{displayDate.toLocaleDateString('fi-FI')}</span><span className="text-xs font-bold text-slate-900">{displayDate.toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'})}</span></div>
                            <h3 className="font-bold text-slate-800 text-sm truncate">{k.deceased_name}</h3>
                            <p className="text-xs text-slate-500 mt-1 truncate">{k.location}</p>
                        </div>
                    )
                })}
            </div>
        </aside>

        <main className="flex-1 bg-slate-50 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><span className="text-slate-400">📅</span> {kuukaudet[nykyinenPvm.getMonth()]} {nykyinenPvm.getFullYear()}</h2>
                <div className="flex gap-2"><button onClick={() => vaihdaKuukautta(-1)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-bold">←</button><button onClick={() => setNykyinenPvm(new Date())} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-bold">TÄNÄÄN</button><button onClick={() => vaihdaKuukautta(1)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-bold">→</button></div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">{['Ma','Ti','Ke','To','Pe','La','Su'].map(d => (<div key={d} className="py-3 text-center text-xs font-bold text-slate-400 uppercase">{d}</div>))}</div>
                <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                    {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} className="bg-slate-50/50 min-h-[100px]"></div>))}
                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1; const dayTasks = haeKeikatPaivalle(day);
                        return (
                            <div key={day} className={`bg-white min-h-[100px] p-1 transition hover:bg-slate-50/80`}>
                                <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full text-slate-400`}>{day}</div>
                                <div className="space-y-1">{dayTasks.map(task => {
                                    const taskDate = new Date(task.date)
                                    let colorClass = 'bg-red-50 text-red-900 border-red-200'
                                    if (task.hasTransport) {
                                        if (task.is_completed) colorClass = 'bg-gray-100 text-gray-500 border-gray-200 line-through'
                                        else if (task.is_own_drive) colorClass = 'bg-violet-50 text-violet-900 border-violet-200'
                                        else colorClass = 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                    }
                                    return (<button key={task.id} onClick={() => setValittuKeikka(task)} className={`w-full text-left text-[10px] px-1.5 py-1 rounded border shadow-sm truncate font-medium ${colorClass}`}>{taskDate.toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'})} {task.deceased_name.split(' ')[0]}</button>)
                                })}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </main>
      </div>

      {valittuKeikka && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setValittuKeikka(null)}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                    <div>
                        <span className={`text-xs font-bold uppercase tracking-widest mb-1 block ${valittuKeikka.is_completed ? 'text-gray-400' : valittuKeikka.hasTransport ? 'text-emerald-400' : 'text-red-400'}`}>
                            {valittuKeikka.is_completed ? 'SUORITETTU' : valittuKeikka.hasTransport ? 'KULJETUS TILATTU' : 'EI KULJETUSTA'}
                        </span>
                        <h2 className="text-2xl font-serif font-bold">{valittuKeikka.deceased_name}</h2>
                    </div>
                    <button onClick={() => setValittuKeikka(null)} className="text-slate-400 hover:text-white text-2xl font-bold leading-none">×</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 text-center">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">Siunausaika</p>
                        <p className="text-3xl font-bold text-amber-900 mb-1">{new Date(valittuKeikka.date).toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'})}</p>
                        <p className="text-sm font-bold text-amber-700 uppercase">{new Date(valittuKeikka.date).toLocaleDateString('fi-FI')}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Siunauspaikka</p>
                            <p className="font-bold text-slate-800 text-lg">{valittuKeikka.location || '-'}</p>
                            <p className="text-slate-500 text-sm">{valittuKeikka.address}</p>
                        </div>
                        {valittuKeikka.hasTransport && (
                            <div className={`p-4 rounded-lg border ${valittuKeikka.is_own_drive ? 'bg-violet-50 border-violet-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                <p className={`text-xs font-bold uppercase mb-1 ${valittuKeikka.is_own_drive ? 'text-violet-700' : 'text-emerald-700'}`}>Kuljetusliike</p>
                                <p className={`font-bold ${valittuKeikka.is_own_drive ? 'text-violet-900' : 'text-emerald-900'}`}>{valittuKeikka.transportProvider}</p>
                                {valittuKeikka.notes && <p className="italic text-slate-600 text-sm mt-1">"{valittuKeikka.notes}"</p>}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center flex gap-2">
                    {valittuKeikka.hasTransport && (
                        <button onClick={merkitseValmiiksi} className={`flex-1 py-3 rounded-lg font-bold uppercase text-xs ${valittuKeikka.is_completed ? 'bg-white border border-slate-300 text-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                            {valittuKeikka.is_completed ? 'Merkitse keskeneräiseksi' : '✓ Merkitse valmiiksi'}
                        </button>
                    )}
                    <button onClick={() => setValittuKeikka(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-lg font-bold uppercase text-xs hover:bg-slate-100">Sulje</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}