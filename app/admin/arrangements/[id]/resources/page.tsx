'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation' // Huom: useParams
import { supabase } from '@/lib/supabase'

export default function ResourceManagementPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [arrangement, setArrangement] = useState<any>(null)
  const [resources, setResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // TILA: Mikä välilehti on auki?
  const [activeTab, setActiveTab] = useState('Kuljetus') // 'Kuljetus', 'Tila', 'Pitopalvelu', 'Muu'

  // LOMAKE
  const [newRes, setNewRes] = useState({
    provider_name: '',
    booking_time: '',
    location_from: '',
    location_to: '',
    headcount: '',
    menu_details: '',
    notes: '',
    status: 'Varattava'
  })

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  async function fetchData() {
    // 1. Hae vainajan tiedot
    const { data: arr } = await supabase.from('arrangements').select('*').eq('id', id).single()
    setArrangement(arr)

    // 2. Hae resurssit
    const { data: res } = await supabase.from('resource_bookings').select('*').eq('arrangement_id', id).order('booking_time')
    setResources(res || [])
    setLoading(false)
  }

  async function lisaaVaraus() {
    const { error } = await supabase.from('resource_bookings').insert({
        arrangement_id: id,
        resource_type: activeTab,
        provider_name: newRes.provider_name,
        booking_time: newRes.booking_time ? new Date(newRes.booking_time) : null,
        location_from: newRes.location_from,
        location_to: newRes.location_to,
        headcount: newRes.headcount ? parseInt(newRes.headcount) : null,
        menu_details: newRes.menu_details,
        notes: newRes.notes,
        status: newRes.status
    })

    if (error) alert('Virhe: ' + error.message)
    else {
        fetchData()
        // Tyhjennä lomake
        setNewRes({ provider_name: '', booking_time: '', location_from: '', location_to: '', headcount: '', menu_details: '', notes: '', status: 'Varattava' })
    }
  }

  async function poista(resId: string) {
    if(!confirm('Poistetaanko varaus?')) return
    await supabase.from('resource_bookings').delete().eq('id', resId)
    setResources(resources.filter(r => r.id !== resId))
  }

  // Toiminto tietojen kopiointiin leikepöydälle (sähköpostia varten)
  const kopioiTiedot = (r: any) => {
    let teksti = `TILAUSVAHVISTUS / TARJOUSPYYNTÖ\n`
    teksti += `Tyyppi: ${r.resource_type}\n`
    teksti += `Asiakas/Vainaja: ${arrangement.deceased_name}\n`
    teksti += `Ajankohta: ${new Date(r.booking_time).toLocaleString()}\n`
    
    if (r.resource_type === 'Kuljetus') {
        teksti += `Nouto: ${r.location_from}\n`
        teksti += `Vienti: ${r.location_to}\n`
    }
    if (r.resource_type === 'Pitopalvelu') {
        teksti += `Henkilömäärä: ${r.headcount}\n`
        teksti += `Menu/Toiveet: ${r.menu_details}\n`
    }
    if (r.notes) teksti += `Lisätiedot: ${r.notes}\n`

    navigator.clipboard.writeText(teksti)
    alert('Tiedot kopioitu leikepöydälle! Voit liittää ne sähköpostiin.')
  }

  if (loading) return <div className="p-10 text-center">Ladataan...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-8">
        
        {/* Yläpalkki */}
        <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
            <div>
                <button onClick={() => router.push('/admin')} className="text-sm text-slate-500 hover:text-slate-800 mb-2">← Takaisin pääsivulle</button>
                <h1 className="text-3xl font-serif font-bold text-slate-900">{arrangement.deceased_name}</h1>
                <p className="text-slate-500 uppercase tracking-widest text-xs mt-1">Resurssien hallinta</p>
            </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-12 gap-8">
            
            {/* VÄLILEHDET JA LOMAKE */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Välilehdet */}
                    <div className="flex border-b border-slate-200 bg-slate-50">
                        {['Kuljetus', 'Pitopalvelu', 'Tila', 'Henkilöstö', 'Muu'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${activeTab === tab ? 'bg-white border-b-2 border-slate-800 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Lomake (Räätälöityy valinnan mukaan) */}
                    <div className="p-8">
                        <h3 className="font-bold text-lg mb-4 text-slate-700">Lisää uusi {activeTab.toLowerCase()}</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            
                            {/* Yleiset kentät */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Palveluntarjoaja</label>
                                <input className="w-full border p-2 rounded" placeholder={activeTab === 'Kuljetus' ? 'Kuljetusliike X' : 'Pitopalvelu Y'} value={newRes.provider_name} onChange={e => setNewRes({...newRes, provider_name: e.target.value})} />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Ajankohta</label>
                                <input type="datetime-local" className="w-full border p-2 rounded" value={newRes.booking_time} onChange={e => setNewRes({...newRes, booking_time: e.target.value})} />
                            </div>

                            {/* KULJETUS-SPESIFIT */}
                            {activeTab === 'Kuljetus' && (
                                <>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Noutopaikka (Mistä)</label>
                                        <input className="w-full border p-2 rounded bg-blue-50" placeholder="Sairaalan kylmiö..." value={newRes.location_from} onChange={e => setNewRes({...newRes, location_from: e.target.value})} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Määränpää (Mihin)</label>
                                        <input className="w-full border p-2 rounded bg-blue-50" placeholder="Kappeli..." value={newRes.location_to} onChange={e => setNewRes({...newRes, location_to: e.target.value})} />
                                    </div>
                                </>
                            )}

                            {/* PITOPALVELU-SPESIFIT */}
                            {activeTab === 'Pitopalvelu' && (
                                <>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Henkilömäärä</label>
                                        <input type="number" className="w-full border p-2 rounded bg-orange-50" placeholder="50" value={newRes.headcount} onChange={e => setNewRes({...newRes, headcount: e.target.value})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Menu / Erityisruokavaliot</label>
                                        <textarea className="w-full border p-2 rounded bg-orange-50 h-20" placeholder="Lohikeitto, 2x gluteeniton..." value={newRes.menu_details} onChange={e => setNewRes({...newRes, menu_details: e.target.value})} />
                                    </div>
                                </>
                            )}

                            {/* TILA-SPESIFIT */}
                            {activeTab === 'Tila' && (
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Tilan nimi / Sijainti</label>
                                    <input className="w-full border p-2 rounded bg-green-50" placeholder="Seurakuntatalo..." value={newRes.location_from} onChange={e => setNewRes({...newRes, location_from: e.target.value})} />
                                </div>
                            )}

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Sisäiset lisätiedot</label>
                                <input className="w-full border p-2 rounded" placeholder="Muista avaimet..." value={newRes.notes} onChange={e => setNewRes({...newRes, notes: e.target.value})} />
                            </div>

                            <div className="col-span-2 pt-2">
                                <button onClick={lisaaVaraus} className="bg-slate-800 text-white px-6 py-3 rounded-lg font-bold w-full hover:bg-slate-900 transition">Lisää varaus</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LISTAUS */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-400 uppercase tracking-widest text-sm">Tallennetut varaukset</h3>
                    {resources.map(r => (
                        <div key={r.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                        r.resource_type === 'Kuljetus' ? 'bg-blue-100 text-blue-800' :
                                        r.resource_type === 'Pitopalvelu' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                        {r.resource_type}
                                    </span>
                                    <span className="font-bold text-slate-800">{r.provider_name}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${r.status === 'Vahvistettu' ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{r.status}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-4">
                                <div><span className="block text-xs text-slate-400 uppercase">Aika</span>{r.booking_time ? new Date(r.booking_time).toLocaleString() : '-'}</div>
                                
                                {r.resource_type === 'Kuljetus' && (
                                    <>
                                        <div><span className="block text-xs text-slate-400 uppercase">Reitti</span>{r.location_from} ➝ {r.location_to}</div>
                                    </>
                                )}
                                {r.resource_type === 'Pitopalvelu' && (
                                    <>
                                        <div><span className="block text-xs text-slate-400 uppercase">Hlömäärä</span>{r.headcount}</div>
                                        <div className="col-span-2"><span className="block text-xs text-slate-400 uppercase">Menu</span>{r.menu_details}</div>
                                    </>
                                )}
                                {r.notes && <div className="col-span-2"><span className="block text-xs text-slate-400 uppercase">Lisätiedot</span>{r.notes}</div>}
                            </div>

                            <div className="flex justify-between border-t pt-4">
                                <button onClick={() => kopioiTiedot(r)} className="text-slate-500 hover:text-slate-900 text-xs font-bold uppercase flex items-center gap-1">📋 Kopioi tiedot</button>
                                <button onClick={() => poista(r.id)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase">Poista</button>
                            </div>
                        </div>
                    ))}
                    {resources.length === 0 && <p className="text-center text-slate-400 italic">Ei varauksia.</p>}
                </div>
            </div>

            {/* OIKEA PALSTA: YHTEENVETO (STAATTINEN) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Perustiedot</h3>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-slate-500">Siunaus:</span> {arrangement.ceremony_date ? new Date(arrangement.ceremony_date).toLocaleString() : '-'}</p>
                        <p><span className="text-slate-500">Paikka:</span> {arrangement.location_name}</p>
                        <p><span className="text-slate-500">Muistotilaisuus:</span> {arrangement.memorial_location_name}</p>
                    </div>
                </div>
            </div>

        </div>
    </div>
  )
}