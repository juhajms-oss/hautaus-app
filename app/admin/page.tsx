'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPanel() {
  // --- NÄKYMÄTILAT ---
  const [nakyma, setNakyma] = useState('toimeksiannot') // 'toimeksiannot', 'resurssit', 'tuotteet', 'kumppanit'
  const [ladataan, setLadataan] = useState(true)

  // --- DATA ---
  const [asiakkaat, setAsiakkaat] = useState<any[]>([])
  const [tuotteet, setTuotteet] = useState<any[]>([])
  const [kaikkiResurssit, setKaikkiResurssit] = useState<any[]>([]) 
  const [kumppanit, setKumppanit] = useState<any[]>([]) // UUSI: Kumppanitunnukset

  // --- VALITUN ASIAKKAAN TILAT ---
  const [valittuAsiakas, setValittuAsiakas] = useState<any>(null)
  const [oikeudet, setOikeudet] = useState<any[]>([])
  const [tehtavat, setTehtavat] = useState<any[]>([])
  const [tilaukset, setTilaukset] = useState<any[]>([])
  const [asiakkaanResurssit, setAsiakkaanResurssit] = useState<any[]>([])
  const [luodaanUutta, setLuodaanUutta] = useState(false)
  
  // Lomakekentät (Admin-toiminnot)
  const [uusiNimi, setUusiNimi] = useState('')
  const [uusiTehtava, setUusiTehtava] = useState('')
  const [uusiEmail, setUusiEmail] = useState('')
  const [uusiKoodi, setUusiKoodi] = useState('')
  const [uusiRooli, setUusiRooli] = useState('vieras')
  const [manuaaliTuote, setManuaaliTuote] = useState('')
  const [manuaaliHinta, setManuaaliHinta] = useState('')

  // Kumppanin lisäys (UUSI)
  const [uusiKumppaniEmail, setUusiKumppaniEmail] = useState('')
  const [uusiKumppaniKoodi, setUusiKumppaniKoodi] = useState('')
  const [uusiKumppaniYritys, setUusiKumppaniYritys] = useState('') // Esim. "Kuljetus Virtanen"

  // Tuotehallinta lomake
  const [uusiTuote, setUusiTuote] = useState({ name: '', price: '', category: 'Kukat', description: '', image_emoji: '🌸' })

  // Resurssin lisäys/muokkaus
  const [muokattavaResurssi, setMuokattavaResurssi] = useState<any>(null)
  const [uusiResurssi, setUusiResurssi] = useState({ type: 'Kuljetus', provider: '', time: '', status: 'Varattava', notes: '' })

  useEffect(() => { 
    haeAsiakkaat(); haeTuotteet(); haeKaikkiResurssit(); haeKumppanit();
  }, [])

  async function haeAsiakkaat() { const { data } = await supabase.from('arrangements').select('*').order('created_at', { ascending: false }); setAsiakkaat(data || []); setLadataan(false) }
  async function haeTuotteet() { const { data } = await supabase.from('products').select('*').order('category'); setTuotteet(data || []) }
  async function haeKaikkiResurssit() { const { data } = await supabase.from('resource_bookings').select('*, arrangements ( deceased_name )').order('booking_time', { ascending: true }); setKaikkiResurssit(data || []) }
  
  // UUSI: Hae kumppanit (ne joilla on company_name)
  async function haeKumppanit() {
    const { data } = await supabase.from('access_rights').select('*').not('company_name', 'is', null)
    setKumppanit(data || [])
  }

  async function valitseAsiakas(asiakas: any) {
    setValittuAsiakas(asiakas); setLuodaanUutta(false); setNakyma('toimeksiannot')
    const [userData, tData, oData, rData] = await Promise.all([
        supabase.from('access_rights').select('*').eq('arrangement_id', asiakas.id),
        supabase.from('tasks').select('*').eq('arrangement_id', asiakas.id).order('created_at'),
        supabase.from('orders').select('*').eq('arrangement_id', asiakas.id).order('created_at', { ascending: false }),
        supabase.from('resource_bookings').select('*').eq('arrangement_id', asiakas.id).order('booking_time')
    ])
    setOikeudet(userData.data || []); setTehtavat(tData.data || []); setTilaukset(oData.data || []); setAsiakkaanResurssit(rData.data || [])
  }

  // --- KUMPPANIHALLINTA (UUSI) ---
  async function lisaaKumppani() {
    if (!uusiKumppaniEmail || !uusiKumppaniYritys) return alert('Tiedot puuttuu')
    const { data, error } = await supabase.from('access_rights').insert({
        email: uusiKumppaniEmail,
        code: uusiKumppaniKoodi,
        role: 'kuljetus', // Tai 'kumppani'
        company_name: uusiKumppaniYritys
    }).select()
    if (data) {
        setKumppanit([...kumppanit, data[0]])
        setUusiKumppaniEmail(''); setUusiKumppaniKoodi(''); setUusiKumppaniYritys('')
        alert('Kumppanitunnus luotu! Kaikki varaukset nimellä "' + uusiKumppaniYritys + '" näkyvät nyt hänelle.')
    } else {
        alert(error?.message)
    }
  }
  
  async function poistaKumppani(id: string) {
      if(!confirm('Poistetaanko tunnus?')) return
      await supabase.from('access_rights').delete().eq('id', id)
      setKumppanit(kumppanit.filter(k => k.id !== id))
  }

  // --- MUUT FUNKTIOT (SUPISTETTU TILAA VARTEN) ---
  async function tallennaMuutokset() { if (!valittuAsiakas) return; await supabase.from('arrangements').update({ deceased_name: valittuAsiakas.deceased_name, status: valittuAsiakas.status, ceremony_date: valittuAsiakas.ceremony_date, nok_name: valittuAsiakas.nok_name, nok_phone: valittuAsiakas.nok_phone, nok_email: valittuAsiakas.nok_email, location_name: valittuAsiakas.location_name, location_address: valittuAsiakas.location_address, memorial_location_name: valittuAsiakas.memorial_location_name, memorial_location_address: valittuAsiakas.memorial_location_address }).eq('id', valittuAsiakas.id); alert('Tiedot tallennettu!'); haeAsiakkaat() }
  async function lisaaResurssiAsiakkaalle() { if (!valittuAsiakas) return; const { data } = await supabase.from('resource_bookings').insert({ arrangement_id: valittuAsiakas.id, resource_type: uusiResurssi.type, provider_name: uusiResurssi.provider, booking_time: uusiResurssi.time ? new Date(uusiResurssi.time) : null, status: uusiResurssi.status, notes: uusiResurssi.notes }).select(); if (data) { setAsiakkaanResurssit([...asiakkaanResurssit, data[0]]); setUusiResurssi({ ...uusiResurssi, provider: '', notes: '' }); haeKaikkiResurssit() } }
  async function paivitaResurssi(resurssi: any) { await supabase.from('resource_bookings').update({ status: resurssi.status, provider_name: resurssi.provider_name, notes: resurssi.notes }).eq('id', resurssi.id); haeKaikkiResurssit(); setMuokattavaResurssi(null) }
  async function poistaResurssi(id: string) { if(!confirm('Poistetaanko?')) return; await supabase.from('resource_bookings').delete().eq('id', id); setAsiakkaanResurssit(asiakkaanResurssit.filter(r => r.id !== id)); setKaikkiResurssit(kaikkiResurssit.filter(r => r.id !== id)) }
  async function lisaaManuaaliTilaus() { if (!manuaaliTuote || !manuaaliHinta || !valittuAsiakas) return; const { data } = await supabase.from('orders').insert({ arrangement_id: valittuAsiakas.id, product_name: manuaaliTuote, price: parseFloat(manuaaliHinta), status: 'Admin lisäsi' }).select(); if (data) { setTilaukset([data[0], ...tilaukset]); setManuaaliTuote(''); setManuaaliHinta('') } }
  const valitseTuoteListasta = (e: React.ChangeEvent<HTMLSelectElement>) => { const tuoteId = e.target.value; const tuote = tuotteet.find(t => t.id === tuoteId); if (tuote) { setManuaaliTuote(tuote.name); setManuaaliHinta(tuote.price.toString()) } }
  async function luoUusiAsiakas() { if(!uusiNimi) return; const { data } = await supabase.from('arrangements').insert({ deceased_name: uusiNimi, status: 'Vastaanotettu' }).select().single(); if (data) { setAsiakkaat([data, ...asiakkaat]); valitseAsiakas(data); setUusiNimi('') } }
  async function lisaaKayttaja() { if (!uusiEmail || !uusiKoodi || !valittuAsiakas) return; const { data } = await supabase.from('access_rights').insert({ arrangement_id: valittuAsiakas.id, email: uusiEmail, code: uusiKoodi, role: uusiRooli }).select(); if (data) { setOikeudet([...oikeudet, data[0]]); setUusiEmail(''); setUusiKoodi('') } }
  async function poistaKayttaja(id: string) { if(!confirm('Poistetaanko?')) return; await supabase.from('access_rights').delete().eq('id', id); setOikeudet(oikeudet.filter(o => o.id !== id)) }
  async function lisaaTehtava() { if (!uusiTehtava || !valittuAsiakas) return; const { data } = await supabase.from('tasks').insert({ arrangement_id: valittuAsiakas.id, title: uusiTehtava, is_completed: false }).select(); if (data) { setTehtavat([...tehtavat, data[0]]); setUusiTehtava('') } }
  async function poistaTehtava(id: string) { if(!confirm('Poistetaanko?')) return; await supabase.from('tasks').delete().eq('id', id); setTehtavat(tehtavat.filter(t => t.id !== id)) }
  async function poistaTilaus(id: string) { if(!confirm('Poistetaanko?')) return; await supabase.from('orders').delete().eq('id', id); setTilaukset(tilaukset.filter(t => t.id !== id)) }
  async function lisaaTuote() { if (!uusiTuote.name || !uusiTuote.price) return alert('Tiedot puuttuu'); const { data } = await supabase.from('products').insert({ name: uusiTuote.name, price: parseFloat(uusiTuote.price), category: uusiTuote.category, description: uusiTuote.description, image_emoji: uusiTuote.image_emoji }).select(); if (data) { setTuotteet([...tuotteet, data[0]]); setUusiTuote({ name: '', price: '', category: 'Kukat', description: '', image_emoji: '🌸' }) } }
  async function poistaTuote(id: string) { if(!confirm('Poistetaanko?')) return; await supabase.from('products').delete().eq('id', id); setTuotteet(tuotteet.filter(t => t.id !== id)) }

  const adressit = tilaukset.filter(t => t.message && t.message.length > 0)
  const hankinnat = tilaukset.filter(t => !t.message || t.message.length === 0)
  const summaAdressit = adressit.reduce((acc, curr) => acc + (curr.price || 0), 0)
  const summaHankinnat = hankinnat.reduce((acc, curr) => acc + (curr.price || 0), 0)
  const kokonaisSumma = summaAdressit + summaHankinnat

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {/* SIVUPALKKI */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 sticky top-0">
        <div className="p-6 border-b border-slate-100">
          <h1 className="font-bold text-slate-800 text-lg tracking-tight">HAUTAUS-APP</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Hallinta</p>
        </div>
        <div className="p-4 space-y-2">
            <button onClick={() => setNakyma('toimeksiannot')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition ${nakyma === 'toimeksiannot' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>📋 Toimeksiannot</button>
            <button onClick={() => { haeKaikkiResurssit(); setNakyma('resurssit'); }} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition ${nakyma === 'resurssit' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>📅 Resurssikalenteri</button>
            <button onClick={() => setNakyma('kumppanit')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition ${nakyma === 'kumppanit' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>🤝 Yhteistyökumppanit</button>
            <button onClick={() => setNakyma('tuotteet')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition ${nakyma === 'tuotteet' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>🛍️ Tuotehallinta</button>
        </div>
        
        {nakyma === 'toimeksiannot' && (
            <>
                <div className="px-4 pb-2 mt-4 border-t border-slate-100 pt-4"><button onClick={() => { setValittuAsiakas(null); setLuodaanUutta(true); }} className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-200">+ Uusi asiakas</button></div>
                <div className="flex-1 overflow-y-auto">
                {asiakkaat.map(a => (
                    <div key={a.id} onClick={() => valitseAsiakas(a)} className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition ${valittuAsiakas?.id === a.id ? 'bg-slate-50 border-l-4 border-slate-600' : ''}`}>
                    <h3 className="font-medium text-slate-700">{a.deceased_name}</h3>
                    <div className="flex justify-between items-center mt-1"><span className="text-xs text-slate-400 uppercase">{a.status}</span></div>
                    </div>
                ))}
                </div>
            </>
        )}
      </div>

      {/* OIKEA PÄÄNÄKYMÄ */}
      <div className="flex-1 h-screen overflow-y-auto bg-slate-50/50">
        
        {/* --- NÄKYMÄ 4: KUMPPANIT (UUSI) --- */}
        {nakyma === 'kumppanit' && (
            <div className="max-w-5xl mx-auto p-10">
                <h2 className="text-3xl font-bold text-slate-800 mb-8">Yhteistyökumppanit</h2>
                
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Luo tunnukset kumppanille</h3>
                    <p className="text-sm text-slate-500 mb-4">Kun luot tunnukset, määritä kumppanin nimi (esim. "Kuljetus Virtanen"). Kumppani näkee omassa näkymässään automaattisesti kaikki ne ajot ja varaukset, joissa olet käyttänyt juuri tätä nimeä toimittajana.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Yrityksen nimi (TÄRKEÄ)</label><input className="w-full border p-2 rounded" placeholder="Esim. Kuljetus Virtanen" value={uusiKumppaniYritys} onChange={e => setUusiKumppaniYritys(e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Sähköposti (Tunnus)</label><input className="w-full border p-2 rounded" placeholder="kuski@virtanen.fi" value={uusiKumppaniEmail} onChange={e => setUusiKumppaniEmail(e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Salasana</label><input className="w-full border p-2 rounded" placeholder="auto123" value={uusiKumppaniKoodi} onChange={e => setUusiKumppaniKoodi(e.target.value)} /></div>
                    </div>
                    <button onClick={lisaaKumppani} className="mt-4 bg-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-bold uppercase hover:bg-emerald-700">Luo tunnukset</button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase"><tr><th className="p-4">Yritys</th><th className="p-4">Tunnus</th><th className="p-4">Salasana</th><th className="p-4"></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {kumppanit.map(k => (
                                <tr key={k.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800">{k.company_name}</td>
                                    <td className="p-4">{k.email}</td>
                                    <td className="p-4 font-mono text-slate-500">{k.code}</td>
                                    <td className="p-4 text-right"><button onClick={() => poistaKumppani(k.id)} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase">Poista</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- NÄKYMÄ 1: RESURSSIKALENTERI --- */}
        {nakyma === 'resurssit' && (
            <div className="max-w-7xl mx-auto p-10">
                <div className="flex justify-between items-end mb-8">
                    <div><h2 className="text-3xl font-bold text-slate-800">Resurssikalenteri</h2><p className="text-slate-500 text-sm mt-1">Koontinäyttö: Kaikki tulevat kuljetukset, tilat ja varaukset.</p></div>
                    <button onClick={haeKaikkiResurssit} className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">↻ Päivitä lista</button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase"><tr><th className="p-4 w-40">Ajankohta</th><th className="p-4 w-32">Resurssi</th><th className="p-4">Asiakas / Vainaja</th><th className="p-4">Toimittaja / Paikka</th><th className="p-4">Status</th><th className="p-4 w-20"></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {kaikkiResurssit.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-sm font-medium text-slate-700">{r.booking_time ? new Date(r.booking_time).toLocaleString('fi-FI', {weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                                    <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{r.resource_type}</span></td>
                                    <td className="p-4 font-serif font-bold text-slate-800">{r.arrangements?.deceased_name || '(Poistettu)'}</td>
                                    {muokattavaResurssi === r.id ? (<><td className="p-4"><input className="border rounded p-1 text-sm w-full" defaultValue={r.provider_name} onChange={(e) => r.provider_name = e.target.value} /></td><td className="p-4"><select className="border rounded p-1 text-sm" defaultValue={r.status} onChange={(e) => r.status = e.target.value}><option>Varattava</option><option>Alustava</option><option>Vahvistettu</option></select></td><td className="p-4 text-right"><button onClick={() => paivitaResurssi(r)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold">OK</button></td></>) : (<><td className="p-4 text-sm font-medium">{r.provider_name || '-'}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${r.status === 'Vahvistettu' ? 'bg-emerald-100 text-emerald-800' : r.status === 'Alustava' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td><td className="p-4 text-right space-x-2"><button onClick={() => setMuokattavaResurssi(r.id)} className="text-slate-400 hover:text-slate-800 text-lg mr-3">✎</button><button onClick={() => poistaResurssi(r.id)} className="text-red-300 hover:text-red-600 text-lg">✕</button></td></>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {kaikkiResurssit.length === 0 && <div className="p-10 text-center text-slate-400 italic">Ei tulevia varauksia kalenterissa.</div>}
                </div>
            </div>
        )}

        {/* --- NÄKYMÄ 2: TUOTEHALLINTA --- */}
        {nakyma === 'tuotteet' && (
            <div className="max-w-5xl mx-auto p-10">
                <h2 className="text-3xl font-bold text-slate-800 mb-8">Tuotehallinta</h2>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Lisää uusi tuote valikoimaan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nimi</label><input className="w-full border p-2 rounded" placeholder="Esim. Valkoinen kimppu" value={uusiTuote.name} onChange={e => setUusiTuote({...uusiTuote, name: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Hinta (€)</label><input type="number" className="w-full border p-2 rounded" placeholder="0.00" value={uusiTuote.price} onChange={e => setUusiTuote({...uusiTuote, price: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Kategoria</label><select className="w-full border p-2 rounded bg-white" value={uusiTuote.category} onChange={e => setUusiTuote({...uusiTuote, category: e.target.value})}><option>Kukat</option><option>Uurnat</option><option>Arkut</option><option>Kuljetus</option><option>Tarjoilut</option><option>Palvelut</option></select></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Emoji</label><input className="w-full border p-2 rounded text-center" placeholder="🌸" value={uusiTuote.image_emoji} onChange={e => setUusiTuote({...uusiTuote, image_emoji: e.target.value})} /></div>
                        <div className="md:col-span-5"><label className="text-xs font-bold text-slate-500 uppercase">Kuvaus</label><input className="w-full border p-2 rounded" placeholder="Lyhyt kuvaus" value={uusiTuote.description} onChange={e => setUusiTuote({...uusiTuote, description: e.target.value})} /></div>
                    </div>
                    <button onClick={lisaaTuote} className="mt-4 bg-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-bold uppercase hover:bg-emerald-700">Lisää tuote</button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase"><tr><th className="p-4">Emoji</th><th className="p-4">Nimi</th><th className="p-4">Kategoria</th><th className="p-4">Hinta</th><th className="p-4"></th></tr></thead><tbody className="divide-y divide-slate-100">{tuotteet.map(t => (<tr key={t.id} className="hover:bg-slate-50"><td className="p-4 text-2xl">{t.image_emoji}</td><td className="p-4 font-bold text-slate-700">{t.name}</td><td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-500">{t.category}</span></td><td className="p-4 font-bold text-emerald-600">{t.price} €</td><td className="p-4 text-sm text-slate-500">{t.description}</td><td className="p-4 text-right"><button onClick={() => poistaTuote(t.id)} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase">Poista</button></td></tr>))}</tbody></table></div>
            </div>
        )}

        {/* --- NÄKYMÄ 3: TOIMEKSIANNOT --- */}
        {nakyma === 'toimeksiannot' && (
            <>
            {luodaanUutta && (
            <div className="p-10 flex justify-center">
                <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 max-w-xl w-full">
                    <h2 className="text-2xl font-bold mb-6 text-slate-800">Uusi toimeksianto</h2>
                    <input className="w-full border border-slate-200 rounded-lg p-4 mb-6 bg-slate-50" placeholder="Esim. Matti Meikäläinen" value={uusiNimi} onChange={e => setUusiNimi(e.target.value)} />
                    <button onClick={luoUusiAsiakas} className="bg-slate-800 text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-slate-700 w-full">Luo ja avaa tiedot</button>
                </div>
            </div>
            )}

            {valittuAsiakas && (
            <div className="max-w-6xl mx-auto p-8 space-y-6">
                <div className="flex justify-between items-center sticky top-0 bg-slate-50/95 backdrop-blur z-10 py-4 border-b border-slate-200 mb-4">
                    <div><h2 className="text-3xl font-serif text-slate-800">{valittuAsiakas.deceased_name}</h2><p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Luotu: {new Date(valittuAsiakas.created_at).toLocaleDateString()}</p></div>
                    <button onClick={tallennaMuutokset} className="bg-emerald-600 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 shadow-md">Tallenna muutokset</button>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Toimeksiannon tiedot</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Tila</label><select className="w-full border border-slate-200 rounded p-2 bg-slate-50" value={valittuAsiakas.status} onChange={e => setValittuAsiakas({...valittuAsiakas, status: e.target.value})}><option>Vastaanotettu</option><option>Järjestelyt käynnissä</option><option>Odottaa uurnaa</option><option>Valmis</option><option>Laskutettu</option></select></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Palvellut</label><input className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.served_by || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, served_by: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Pvm</label><input type="date" className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.arrangement_date || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, arrangement_date: e.target.value})} /></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Vainajan tiedot</h3><div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Nimi</label><input className="w-full border border-slate-200 rounded p-2 bg-slate-50 font-medium" value={valittuAsiakas.deceased_name} onChange={e => setValittuAsiakas({...valittuAsiakas, deceased_name: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Syntymäaika</label><input type="date" className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.date_of_birth || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, date_of_birth: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Sotu</label><input className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.ssn || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, ssn: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Kuolinpäivä</label><input type="date" className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.date_of_death || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, date_of_death: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Kuolinpaikka</label><input className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.place_of_death || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, place_of_death: e.target.value})} /></div><div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Hautaustapa</label><select className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.burial_method || 'Arkkuhautaus'} onChange={e => setValittuAsiakas({...valittuAsiakas, burial_method: e.target.value})}><option>Arkkuhautaus</option><option>Tuhkaus</option><option>Muu</option></select></div></div></div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Omaisen tiedot</h3><div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Nimi</label><input className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.nok_name || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, nok_name: e.target.value})} /></div><div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Osoite</label><input className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.nok_address || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, nok_address: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Puhelin</label><input className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.nok_phone || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, nok_phone: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Email</label><input className="w-full border border-slate-200 rounded p-2" value={valittuAsiakas.nok_email || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, nok_email: e.target.value})} /></div></div></div>
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        
                        {/* RESURSSIVARAUKSET (LINKKI UUTEEN SIVUUN) */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 bg-gradient-to-br from-white to-slate-50">
                            <div className="flex justify-between items-start mb-4">
                                <div><h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Logistiikka & Varaukset</h3><p className="text-xs text-slate-500 mt-1">Kuljetukset, tilat, pitopalvelut</p></div>
                                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{asiakkaanResurssit.length} kpl</span>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">Hallitse kuljetusreittejä, menuja ja tilavarauksia erillisessä näkymässä.</p>
                            <a href={`/admin/arrangements/${valittuAsiakas.id}/resources`} className="block w-full text-center bg-slate-800 text-white py-3 rounded-lg text-sm font-bold hover:bg-slate-900 transition shadow-md">Avaa resurssien hallinta →</a>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tilaisuudet</h3><div className="mb-4"><label className="block text-xs font-bold text-slate-500 mb-1">Siunausaika</label><input type="datetime-local" className="w-full border border-slate-200 rounded p-2 bg-slate-50" value={valittuAsiakas.ceremony_date ? new Date(valittuAsiakas.ceremony_date).toISOString().slice(0, 16) : ''} onChange={e => setValittuAsiakas({...valittuAsiakas, ceremony_date: e.target.value})} /></div><div className="space-y-3"><div className="p-3 bg-slate-50 rounded border border-slate-100"><label className="block text-xs font-bold text-slate-500">1. Siunaus</label><input className="w-full border-b border-slate-200 bg-transparent py-1 text-sm mb-1" placeholder="Paikka" value={valittuAsiakas.location_name || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, location_name: e.target.value})} /><input className="w-full border-b border-slate-200 bg-transparent py-1 text-sm text-slate-500" placeholder="Osoite" value={valittuAsiakas.location_address || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, location_address: e.target.value})} /></div><div className="p-3 bg-slate-50 rounded border border-slate-100"><label className="block text-xs font-bold text-slate-500">2. Muistotilaisuus</label><input className="w-full border-b border-slate-200 bg-transparent py-1 text-sm mb-1" placeholder="Paikka" value={valittuAsiakas.memorial_location_name || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, memorial_location_name: e.target.value})} /><input className="w-full border-b border-slate-200 bg-transparent py-1 text-sm text-slate-500" placeholder="Osoite" value={valittuAsiakas.memorial_location_address || ''} onChange={e => setValittuAsiakas({...valittuAsiakas, memorial_location_address: e.target.value})} /></div></div></div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Käyttäjätunnukset</h3><div className="flex gap-2 mb-3"><input className="w-full border border-slate-200 rounded p-1.5 text-xs" placeholder="Email" value={uusiEmail} onChange={e => setUusiEmail(e.target.value)} /><input className="w-20 border border-slate-200 rounded p-1.5 text-xs" placeholder="Koodi" value={uusiKoodi} onChange={e => setUusiKoodi(e.target.value)} /><select className="w-20 border border-slate-200 rounded p-1.5 text-xs" value={uusiRooli} onChange={e => setUusiRooli(e.target.value)}><option value="vieras">Vieras</option><option value="omainen">Omainen</option></select><button onClick={lisaaKayttaja} className="bg-slate-800 text-white px-2 rounded text-xs font-bold">+</button></div><div className="space-y-1">{oikeudet.map(o => (<div key={o.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded"><span className="truncate max-w-[120px]">{o.email}</span><span className="font-mono bg-white px-1 border rounded">{o.code}</span><span className={`uppercase font-bold ${o.role === 'omainen' ? 'text-amber-700' : 'text-slate-500'}`}>{o.role.substring(0,1)}</span><button onClick={() => poistaKayttaja(o.id)} className="text-red-400 hover:text-red-600">×</button></div>))}</div></div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tehtävät</h3><div className="flex gap-2 mb-2"><input className="flex-1 border border-slate-200 p-2 rounded text-sm" placeholder="Uusi tehtävä" value={uusiTehtava} onChange={e => setUusiTehtava(e.target.value)} /><button onClick={lisaaTehtava} className="bg-slate-700 text-white px-3 rounded text-sm">+</button></div><div className="max-h-60 overflow-y-auto space-y-1">{tehtavat.map(t => <div key={t.id} className="flex justify-between p-2 border-b border-slate-50 text-xs"><span className={t.is_completed ? 'line-through text-slate-400' : ''}>{t.title}</span><button onClick={() => poistaTehtava(t.id)} className="text-red-400">×</button></div>)}</div></div>
                    </div>

                    <div className="col-span-12 mt-4 space-y-6">
                        <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Talous & Verkkokauppa (Yhteensä: {kokonaisSumma.toFixed(2)} €)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700">Omaisen hankinnat</h3><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{summaHankinnat.toFixed(2)} €</span></div><div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100"><label className="text-xs font-bold text-slate-400 uppercase block mb-1">Lisää tuote laskulle</label><div className="flex gap-2 mb-2"><select className="flex-1 border border-slate-200 p-1.5 rounded text-sm bg-white" onChange={valitseTuoteListasta}><option value="">-- Valitse listasta --</option>{tuotteet.map(p => <option key={p.id} value={p.id}>{p.image_emoji} {p.name} ({p.price}€)</option>)}</select></div><div className="flex gap-2"><input className="flex-1 border border-slate-200 p-1.5 rounded text-sm bg-white" placeholder="Tuote / Palvelu" value={manuaaliTuote} onChange={e => setManuaaliTuote(e.target.value)} /><input className="w-24 border border-slate-200 p-1.5 rounded text-sm bg-white" type="number" placeholder="Hinta" value={manuaaliHinta} onChange={e => setManuaaliHinta(e.target.value)} /><button onClick={lisaaManuaaliTilaus} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-emerald-700">+</button></div></div><table className="w-full text-sm text-left"><thead className="text-xs text-slate-500 uppercase bg-slate-50"><tr><th className="p-2">Tuote</th><th className="p-2">Hinta</th><th className="p-2"></th></tr></thead><tbody>{hankinnat.map(t => (<tr key={t.id} className="border-b hover:bg-slate-50"><td className="p-2 font-medium">{t.product_name}</td><td className="p-2">{t.price} €</td><td className="p-2 text-right"><button onClick={() => poistaTilaus(t.id)} className="text-red-400 hover:text-red-600 text-xs font-bold">POISTA</button></td></tr>))}{hankinnat.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400 italic">Ei hankintoja.</td></tr>}</tbody></table></div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700">Vieraiden Adressit</h3><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">{summaAdressit.toFixed(2)} €</span></div><div className="space-y-3 max-h-96 overflow-y-auto">{adressit.map(t => (<div key={t.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50"><div className="flex justify-between mb-1"><span className="font-bold text-slate-800 text-sm">{t.product_name}</span><span className="text-emerald-600 font-bold text-sm">{t.price} €</span></div><div className="text-xs text-slate-500 mb-2">Lähettäjä: <span className="font-medium text-slate-700">{t.sender_name}</span></div><div className="text-xs italic text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">"{t.message}"</div><div className="text-right mt-2"><button onClick={() => poistaTilaus(t.id)} className="text-red-400 hover:text-red-600 text-xs">Poista tilaus</button></div></div>))}{adressit.length === 0 && <p className="text-center text-slate-400 italic p-4">Ei adresseja.</p>}</div></div>
                        </div>
                    </div>
                </div>
            </div>
            )}
            </>
        )}
      </div>
    </div>
  )
}