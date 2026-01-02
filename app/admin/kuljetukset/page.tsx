'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TransportPlanning() {
  const router = useRouter()
  const [keikat, setKeikat] = useState<any[]>([])
  const [valittuKeikka, setValittuKeikka] = useState<any>(null)
  const [ladataan, setLadataan] = useState(true)
  const [nykyinenPvm, setNykyinenPvm] = useState(new Date())

  // Hälytykset (keikat, joissa siunaus < 7vrk päästä, mutta ei kuljetusta)
  const [halytysLista, setHalytysLista] = useState<any[]>([])

  // Lomake (muokkaus)
  const [editAika, setEditAika] = useState('')
  const [editToimija, setEditToimija] = useState('')
  const [editMuistutus, setEditMuistutus] = useState('')
  const [editOmaAjo, setEditOmaAjo] = useState(false) // Violetti väri

  // Kuljettajan tunnus (oikeudet)
  const [kuskiEmail, setKuskiEmail] = useState('')
  const [kuskiKoodi, setKuskiKoodi] = useState('')

  useEffect(() => {
    haeData()
  }, [])

  async function haeData() {
    // 1. Haetaan kaikki hautajaiset ja niiden resurssit
    const { data: arrangements } = await supabase
      .from('arrangements')
      .select('*, resource_bookings(*)')
      .not('ceremony_date', 'is', null)
      .order('ceremony_date', { ascending: true })

    if (!arrangements) return

    const kasitellytKeikat: any[] = []
    const puuttuvat: any[] = []
    const tanaan = new Date()

    arrangements.forEach((arr: any) => {
      // Etsitään kuljetusvaraus
      let kuljetus = arr.resource_bookings.find((r: any) => r.resource_type === 'Kuljetus')
      const siunausPvm = new Date(arr.ceremony_date)
      
      // Tarkistetaan hälytys (Alle 7vrk siunaukseen eikä kuljetusta)
      const aikaEro = siunausPvm.getTime() - tanaan.getTime()
      const paiviaJaljella = Math.ceil(aikaEro / (1000 * 3600 * 24))

      if (!kuljetus && paiviaJaljella <= 7 && paiviaJaljella >= 0) {
        puuttuvat.push({ ...arr, paiviaJaljella })
      }

      // Luodaan kalenteriobjekti (vaikka kuljetusta ei olisi, näytetään siunaus haaleana/punaisena)
      kasitellytKeikat.push({
        id: arr.id, // Arrangement ID
        resId: kuljetus ? kuljetus.id : null,
        date: kuljetus?.booking_time ? new Date(kuljetus.booking_time) : siunausPvm,
        siunausDate: siunausPvm,
        deceased_name: arr.deceased_name,
        location: arr.location_name,
        hasTransport: !!kuljetus,
        provider: kuljetus?.provider_name || 'Ei määritetty',
        is_completed: kuljetus?.is_completed || false,
        notes: kuljetus?.notes || '',
        is_own_drive: kuljetus?.provider_name === 'Hautaustoimisto' || false // Logiikka violetille värille
      })
    })

    setKeikat(kasitellytKeikat)
    setHalytysLista(puuttuvat)
    setLadataan(false)
  }

  // --- TALLENNUS ---
  async function tallennaMuutokset() {
    if (!valittuKeikka) return

    const toimijaNimi = editOmaAjo ? 'Hautaustoimisto' : editToimija

    if (valittuKeikka.resId) {
        // Päivitetään olemassa oleva
        await supabase.from('resource_bookings').update({
            booking_time: editAika,
            provider_name: toimijaNimi,
            notes: editMuistutus
        }).eq('id', valittuKeikka.resId)
    } else {
        // Luodaan uusi kuljetus
        await supabase.from('resource_bookings').insert({
            arrangement_id: valittuKeikka.id,
            resource_type: 'Kuljetus',
            provider_name: toimijaNimi,
            booking_time: editAika,
            notes: editMuistutus,
            status: 'Vahvistettu',
            location_from: 'Määritä...', // Voidaan hakea arrangementista jos halutaan
            location_to: valittuKeikka.location
        })
    }

    // Jos luodaan tunnus kuskille
    if (kuskiEmail && kuskiKoodi && !editOmaAjo) {
        await supabase.from('access_rights').insert({
            arrangement_id: valittuKeikka.id, // Liitetään tähän keikkaan? Tai yleinen.
            email: kuskiEmail,
            code: kuskiKoodi,
            role: 'kuljetus',
            company_name: toimijaNimi
        })
        alert('Kuljettajan tunnus luotu!')
    }

    alert('Tallennettu!')
    setValittuKeikka(null)
    haeData()
  }

  // --- KALENTERI ---
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

  // Avaa muokkaus
  const avaaKeikka = (k: any) => {
    setValittuKeikka(k)
    setEditAika(k.date.toISOString().slice(0, 16)) // Format datetime-local
    setEditToimija(k.provider === 'Ei määritetty' ? '' : k.provider)
    setEditMuistutus(k.notes)
    setEditOmaAjo(k.provider === 'Hautaustoimisto')
    setKuskiEmail('')
    setKuskiKoodi('')
  }

  if (ladataan) return <div className="p-10 text-center">Ladataan suunnittelua...</div>

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-800">
        
        {/* VASEN SIVUPALKKI: HÄLYTYKSET JA NAVI */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
                <button onClick={() => router.push('/admin')} className="text-xs text-slate-400 mb-2 hover:text-slate-800">← Takaisin pääsivulle</button>
                <h1 className="font-bold text-slate-800 text-lg">Kuljetussuunnittelu</h1>
            </div>
            
            {halytysLista.length > 0 && (
                <div className="p-4 bg-red-50 border-b border-red-100">
                    <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">⚠️ Kiireelliset (Ei kuljetusta)</h3>
                    <div className="space-y-2">
                        {halytysLista.map(h => (
                            <div key={h.id} className="bg-white p-3 rounded border border-red-200 shadow-sm text-sm">
                                <p className="font-bold text-slate-800">{h.deceased_name}</p>
                                <p className="text-xs text-red-500">Siunaus: {new Date(h.ceremony_date).toLocaleDateString()} ({h.paiviaJaljella} pv)</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="p-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Seuraavat ajot</h3>
                {keikat.filter(k => k.hasTransport && !k.is_completed).slice(0, 10).map(k => (
                    <div key={k.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => avaaKeikka(k)}>
                        <div className="flex justify-between">
                            <span className="font-bold text-sm">{k.deceased_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${k.is_own_drive ? 'bg-violet-100 text-violet-700' : 'bg-green-100 text-green-700'}`}>
                                {k.is_own_drive ? 'OMA' : 'ULKO'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">{k.date.toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* OIKEA: KALENTERI */}
        <div className="flex-1 p-8 h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><span className="text-slate-400">📅</span> {['Tammi','Helmi','Maalis','Huhti','Touko','Kesä','Heinä','Elo','Syys','Loka','Marras','Joulu'][nykyinenPvm.getMonth()]}kuu {nykyinenPvm.getFullYear()}</h2>
                <div className="flex gap-2">
                    <button onClick={() => vaihdaKuukautta(-1)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-bold">←</button>
                    <button onClick={() => setNykyinenPvm(new Date())} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-bold">TÄNÄÄN</button>
                    <button onClick={() => vaihdaKuukautta(1)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-bold">→</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">{['Ma','Ti','Ke','To','Pe','La','Su'].map(d => (<div key={d} className="py-3 text-center text-xs font-bold text-slate-400 uppercase">{d}</div>))}</div>
                <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px h-full">
                    {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} className="bg-slate-50/50 min-h-[120px]"></div>))}
                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1; const dayTasks = haeKeikatPaivalle(day);
                        return (
                            <div key={day} className="bg-white min-h-[120px] p-2 hover:bg-slate-50">
                                <div className="text-xs font-bold text-slate-400 mb-1">{day}</div>
                                <div className="space-y-1">{dayTasks.map(task => {
                                    let colorClass = 'bg-red-50 text-red-700 border-red-100' // Oletus: ei kuljetusta
                                    if (task.hasTransport) {
                                        if (task.is_completed) colorClass = 'bg-gray-100 text-gray-500 border-gray-200 line-through'
                                        else if (task.is_own_drive) colorClass = 'bg-violet-50 text-violet-700 border-violet-100'
                                        else colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    }
                                    return (
                                        <button key={task.id} onClick={() => avaaKeikka(task)} className={`w-full text-left text-[10px] px-1.5 py-1 rounded border shadow-sm truncate font-medium ${colorClass}`}>
                                            {task.date.toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'})} {task.deceased_name.split(' ')[0]}
                                        </button>
                                    )
                                })}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {/* --- MUOKKAUS MODAL --- */}
        {valittuKeikka && (
            <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setValittuKeikka(null)}>
                <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-8" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-serif font-bold mb-1">{valittuKeikka.deceased_name}</h2>
                    <p className="text-sm text-slate-500 mb-6">Siunaus: {valittuKeikka.siunausDate.toLocaleString()}</p>
                    
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kuljetusaika</label>
                            <input type="datetime-local" className="w-full border p-2 rounded" value={editAika} onChange={e => setEditAika(e.target.value)} />
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Toimija</label>
                            <div className="flex items-center gap-2 mb-2">
                                <input type="checkbox" checked={editOmaAjo} onChange={e => setEditOmaAjo(e.target.checked)} className="w-4 h-4" />
                                <span className="text-sm font-medium">Ajetaan itse (Hautaustoimisto)</span>
                            </div>
                            {!editOmaAjo && (
                                <input className="w-full border p-2 rounded text-sm" placeholder="Ulkopuolinen toimija (esim. Kuljetus Oy)" value={editToimija} onChange={e => setEditToimija(e.target.value)} />
                            )}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tehtävät / Muistutukset</label>
                            <textarea className="w-full border p-2 rounded text-sm" rows={2} placeholder="Esim. Hae uurna, omat vaatteet..." value={editMuistutus} onChange={e => setEditMuistutus(e.target.value)} />
                        </div>

                        {!editOmaAjo && !valittuKeikka.hasTransport && (
                            <div className="border-t pt-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Luo tunnus kuskille (Valinnainen)</label>
                                <div className="flex gap-2">
                                    <input className="border p-2 rounded text-xs w-1/2" placeholder="Email" value={kuskiEmail} onChange={e => setKuskiEmail(e.target.value)} />
                                    <input className="border p-2 rounded text-xs w-1/2" placeholder="Salasana" value={kuskiKoodi} onChange={e => setKuskiKoodi(e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-between items-center">
                         <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${valittuKeikka.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                             {valittuKeikka.is_completed ? 'Valmis' : 'Kesken'}
                         </span>
                         <div className="flex gap-2">
                             <button onClick={() => setValittuKeikka(null)} className="px-4 py-2 text-slate-500 hover:text-slate-800">Peruuta</button>
                             <button onClick={tallennaMuutokset} className="bg-slate-800 text-white px-6 py-2 rounded font-bold hover:bg-black">Tallenna</button>
                         </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}