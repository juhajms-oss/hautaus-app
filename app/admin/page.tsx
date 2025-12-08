'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPanel() {
  const [asiakkaat, setAsiakkaat] = useState<any[]>([])
  const [valittuAsiakas, setValittuAsiakas] = useState<any>(null)
  const [tehtavat, setTehtavat] = useState<any[]>([])
  const [tilaukset, setTilaukset] = useState<any[]>([])
  const [uusiTehtava, setUusiTehtava] = useState('')
  const [ladataan, setLadataan] = useState(true)
  const [luodaanUutta, setLuodaanUutta] = useState(false)
  const [uusiNimi, setUusiNimi] = useState('')

  useEffect(() => { haeAsiakkaat() }, [])

  async function haeAsiakkaat() {
    const { data } = await supabase.from('arrangements').select('*').order('created_at', { ascending: false })
    setAsiakkaat(data || [])
    setLadataan(false)
  }

  async function valitseAsiakas(asiakas: any) {
    setValittuAsiakas(asiakas)
    setLuodaanUutta(false)
    const { data: tData } = await supabase.from('tasks').select('*').eq('arrangement_id', asiakas.id).order('created_at')
    setTehtavat(tData || [])
    const { data: oData } = await supabase.from('orders').select('*').eq('arrangement_id', asiakas.id).order('created_at', { ascending: false })
    setTilaukset(oData || [])
  }

  async function tallennaMuutokset() {
    if (!valittuAsiakas) return
    const { error } = await supabase.from('arrangements').update({
        deceased_name: valittuAsiakas.deceased_name,
        status: valittuAsiakas.status,
        ceremony_date: valittuAsiakas.ceremony_date,
        location_name: valittuAsiakas.location_name,
        location_address: valittuAsiakas.location_address,
        memorial_location_name: valittuAsiakas.memorial_location_name,
        memorial_location_address: valittuAsiakas.memorial_location_address
      }).eq('id', valittuAsiakas.id)

    if (!error) alert('Tiedot tallennettu!')
    haeAsiakkaat()
  }

  async function lisaaTehtava() {
    if (!uusiTehtava || !valittuAsiakas) return
    const { data } = await supabase.from('tasks').insert({ arrangement_id: valittuAsiakas.id, title: uusiTehtava, is_completed: false }).select()
    if (data) { setTehtavat([...tehtavat, data[0]]); setUusiTehtava('') }
  }

  async function poistaTehtava(id: string) {
    if(!confirm('Haluatko poistaa?')) return
    await supabase.from('tasks').delete().eq('id', id)
    setTehtavat(tehtavat.filter(t => t.id !== id))
  }
  
  async function poistaTilaus(id: string) {
    if(!confirm('Poistetaanko tilaus?')) return
    await supabase.from('orders').delete().eq('id', id)
    setTilaukset(tilaukset.filter(t => t.id !== id))
  }

  async function luoUusiAsiakas() {
    if(!uusiNimi) return
    const { data } = await supabase.from('arrangements').insert({ deceased_name: uusiNimi, status: 'Vastaanotettu' }).select().single()
    if (data) { setAsiakkaat([data, ...asiakkaat]); valitseAsiakas(data); setUusiNimi('') }
  }

  const summa = tilaukset.reduce((acc, curr) => acc + (curr.price || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* SIVUPALKKI: Vaalea */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-screen">
        <div className="p-6 border-b border-slate-100">
          <h1 className="font-bold text-slate-800 text-xl tracking-tight">HAUTAUS-APP</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Hallinta</p>
        </div>
        <div className="p-4"><button onClick={() => { setValittuAsiakas(null); setLuodaanUutta(true); }} className="w-full bg-slate-700 text-white py-3 px-4 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-600 transition">+ Uusi asiakas</button></div>
        <div className="flex-1 overflow-y-auto">
          {asiakkaat.map(a => (
            <div key={a.id} onClick={() => valitseAsiakas(a)} className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition ${valittuAsiakas?.id === a.id ? 'bg-slate-50 border-l-4 border-slate-600' : ''}`}>
              <h3 className="font-medium text-slate-700">{a.deceased_name}</h3>
              <span className="text-xs text-slate-400 uppercase">{a.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 h-screen overflow-y-auto p-10 bg-slate-50/50">
        {luodaanUutta && (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Luo uusi järjestely</h2>
            <input className="w-full border border-slate-200 rounded-lg p-4 mb-6 bg-slate-50" placeholder="Vainajan nimi" value={uusiNimi} onChange={e => setUusiNimi(e.target.value)} />
            <button onClick={luoUusiAsiakas} className="bg-slate-800 text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-slate-700">Luo Asiakas</button>
          </div>
        )}

        {valittuAsiakas && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                <h2 className="text-4xl font-serif text-slate-800">{valittuAsiakas.deceased_name}</h2>
                <button onClick={tallennaMuutokset} className="bg-slate-800 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-700">Tallenna muutokset</button>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 col-span-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Perustiedot</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nimi</label><input className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50" value={valittuAsiakas.deceased_name} onChange={e => setValittuAsiakas({...valittuAsiakas, deceased_name: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label><select className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50" value={valittuAsiakas.status} onChange={e => setValittuAsiakas({...valittuAsiakas, status: e.target.value})}><option>Vastaanotettu</option><option>Järjestelyt käynnissä</option><option>Valmis</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aika</label><input type="datetime-local" className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50" value={valittuAsiakas.ceremony_date ? new Date(valittuAsiakas.ceremony_date).toISOString().slice(0, 16) : ''} onChange={e => setValittuAsiakas({...valittuAsiakas, ceremony_date: e.target.value})} /></div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Sijainnit</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2">1. Siunaus</h4>
                      <input className="w-full border border-slate-200 rounded-lg p-2 mb-2 text-sm" placeholder="Paikan nimi" value={valittuAsiakas.location_name || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, location_name: e.target.value})} />
                      <input className="w-full border border-slate-200 rounded-lg p-2 text-sm" placeholder="Osoite" value={valittuAsiakas.location_address || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, location_address: e.target.value})} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2">2. Muistotilaisuus</h4>
                      <input className="w-full border border-slate-200 rounded-lg p-2 mb-2 text-sm" placeholder="Paikan nimi" value={valittuAsiakas.memorial_location_name || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, memorial_location_name: e.target.value})} />
                      <input className="w-full border border-slate-200 rounded-lg p-2 text-sm" placeholder="Osoite" value={valittuAsiakas.memorial_location_address || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, memorial_location_address: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Tehtävät</h3>
                  <div className="flex gap-2 mb-4"><input className="flex-1 border border-slate-200 rounded-lg p-2 text-sm" placeholder="Uusi tehtävä" value={uusiTehtava} onChange={e => setUusiTehtava(e.target.value)} onKeyDown={e => e.key === 'Enter' && lisaaTehtava()} /><button onClick={lisaaTehtava} className="bg-slate-700 text-white px-4 rounded-lg text-xs font-bold uppercase">Lisää</button></div>
                  <div className="space-y-2">{tehtavat.map(t => <div key={t.id} className="flex justify-between p-2 border-b border-slate-50 text-sm"><span className={t.is_completed ? 'line-through text-slate-400' : ''}>{t.title}</span><button onClick={() => poistaTehtava(t.id)} className="text-red-400 hover:text-red-600">×</button></div>)}</div>
                </div>
            </div>

             <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mt-8">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tilaukset & Laskutus</h3>
                 <span className="text-2xl font-bold text-slate-800">{summa.toFixed(2)} €</span>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold tracking-wider rounded-lg">
                    <tr><th className="px-4 py-3 rounded-l-lg">Tuote</th><th className="px-4 py-3">Hinta</th><th className="px-4 py-3">Pvm</th><th className="px-4 py-3 rounded-r-lg"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {tilaukset.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">Ei tilauksia.</td></tr>}
                    {tilaukset.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{t.product_name}</td>
                            <td className="px-4 py-3">{t.price} €</td>
                            <td className="px-4 py-3 text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right"><button onClick={() => poistaTilaus(t.id)} className="text-red-400 hover:text-red-600">Poista</button></td>
                        </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}