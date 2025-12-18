'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// --- KOMPONENTIT ---

const InputField = ({ label, value, onChange, type = "text", placeholder = "", width = "w-full" }: any) => (
  <div className={`mb-3 ${width}`}>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</label>
      {type === 'textarea' ? (
          <textarea 
            className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 ring-slate-200 outline-none" 
            rows={3} 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
          />
      ) : (
          <input 
            type={type} 
            className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 ring-slate-200 outline-none" 
            placeholder={placeholder} 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
          />
      )}
  </div>
)

const CheckboxField = ({ label, checked, onChange }: any) => (
  <div className="flex items-center gap-2 mb-3 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
      <input 
        type="checkbox" 
        className="w-4 h-4 accent-slate-800" 
        checked={checked || false} 
        onChange={e => onChange(e.target.checked)} 
      />
      <label className="text-xs font-bold text-slate-600 uppercase cursor-pointer select-none" onClick={() => onChange(!checked)}>{label}</label>
  </div>
)

// --- PÄÄKOMPONENTTI ---

export default function AdminPanel() {
  const [ladataan, setLadataan] = useState(true)
  const [asiakkaat, setAsiakkaat] = useState<any[]>([])
  const [valittuAsiakas, setValittuAsiakas] = useState<any>(null)
  const [uusiNimi, setUusiNimi] = useState('')
  const [luodaanUutta, setLuodaanUutta] = useState(false)
  const [aktiivinenOsio, setAktiivinenOsio] = useState<string>('perus')

  // Oikeudet
  const [oikeudet, setOikeudet] = useState<any[]>([])
  const [uusiEmail, setUusiEmail] = useState('')
  const [uusiKoodi, setUusiKoodi] = useState('')
  const [uusiRooli, setUusiRooli] = useState('vieras')
  const [uusiYritys, setUusiYritys] = useState('')

  useEffect(() => { haeAsiakkaat() }, [])

  async function haeAsiakkaat() { 
    const { data } = await supabase.from('arrangements').select('*').order('created_at', { ascending: false })
    setAsiakkaat(data || [])
    setLadataan(false)
  }

  async function valitseAsiakas(asiakas: any) {
    setValittuAsiakas(asiakas)
    setLuodaanUutta(false)
    const { data: userData } = await supabase.from('access_rights').select('*').eq('arrangement_id', asiakas.id)
    setOikeudet(userData || [])
  }

  async function tallenna() {
    if (!valittuAsiakas) return
    const { error } = await supabase.from('arrangements').update(valittuAsiakas).eq('id', valittuAsiakas.id)
    if (error) alert('Virhe: ' + error.message)
    else { alert('Tiedot tallennettu!'); haeAsiakkaat() }
  }

  async function luoUusiAsiakas() { if(!uusiNimi) return; const { data } = await supabase.from('arrangements').insert({ deceased_name: uusiNimi, status: 'Vastaanotettu' }).select().single(); if (data) { setAsiakkaat([data, ...asiakkaat]); valitseAsiakas(data); setUusiNimi('') } }
  async function poistaAsiakas() { if(!confirm('Poistetaanko koko asiakas?')) return; await supabase.from('arrangements').delete().eq('id', valittuAsiakas.id); setValittuAsiakas(null); haeAsiakkaat() }

  async function lisaaKayttaja() {
    if (!uusiEmail || !uusiKoodi || !valittuAsiakas) return
    if (uusiRooli === 'kuljetus' && !uusiYritys) return alert('Kuljettajalle pitää antaa Yrityksen nimi!')
    const { data } = await supabase.from('access_rights').insert({ arrangement_id: valittuAsiakas.id, email: uusiEmail, code: uusiKoodi, role: uusiRooli, company_name: uusiRooli === 'kuljetus' ? uusiYritys : null }).select()
    if (data) { setOikeudet([...oikeudet, data[0]]); setUusiEmail(''); setUusiKoodi(''); setUusiYritys(''); alert('Tunnus luotu!') }
  }
  async function poistaKayttaja(id: string) { if(!confirm('Poistetaanko?')) return; await supabase.from('access_rights').delete().eq('id', id); setOikeudet(oikeudet.filter(o => o.id !== id)) }

  const updateField = (field: string, value: any) => {
    setValittuAsiakas((prev: any) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-800">
      
      {/* SIVUPALKKI */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 sticky top-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50"><h1 className="font-bold text-slate-800 text-lg">Hautaushallinta</h1></div>
        <div className="p-2"><button onClick={() => { setValittuAsiakas(null); setLuodaanUutta(true); }} className="w-full bg-slate-800 text-white py-2 rounded text-xs font-bold uppercase">+ Uusi tilaus</button></div>
        <div className="flex-1 overflow-y-auto">
          {asiakkaat.map(a => (
            <div key={a.id} onClick={() => valitseAsiakas(a)} className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${valittuAsiakas?.id === a.id ? 'bg-slate-100 border-l-4 border-slate-800' : ''}`}>
              <h3 className="font-medium text-sm text-slate-700">{a.deceased_name}</h3><span className="text-[10px] text-slate-400 uppercase">{a.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PÄÄNÄKYMÄ */}
      <div className="flex-1 h-screen overflow-y-auto p-8">
        
        {luodaanUutta && (
            <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg mt-10">
                <h2 className="text-xl font-bold mb-4">Avaa uusi tilaus</h2>
                <input className="w-full border p-3 rounded mb-4" placeholder="Vainajan nimi" value={uusiNimi} onChange={e => setUusiNimi(e.target.value)} />
                <button onClick={luoUusiAsiakas} className="bg-slate-800 text-white px-6 py-3 rounded w-full font-bold">Luo</button>
            </div>
        )}

        {valittuAsiakas && (
          <div className="max-w-6xl mx-auto pb-20">
            
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 sticky top-0 z-10">
                <div><h2 className="text-2xl font-serif font-bold text-slate-800">{valittuAsiakas.deceased_name}</h2><p className="text-xs text-slate-400 uppercase">Muokataan tilausta</p></div>
                <div className="flex gap-2"><button onClick={poistaAsiakas} className="text-red-500 text-xs font-bold uppercase px-4 py-2 hover:bg-red-50 rounded">Poista</button><button onClick={tallenna} className="bg-emerald-600 text-white px-6 py-2 rounded text-sm font-bold uppercase hover:bg-emerald-700 shadow-sm">Tallenna kaikki</button></div>
            </div>

            {/* NAVIGAATIO */}
            <div className="flex flex-wrap gap-2 mb-6">
                {[
                    {id: 'perus', label: 'Perustiedot & Oikeudet'},
                    {id: 'hautaus', label: 'Hautaus'}, // MUUTETTU
                    {id: 'muisto', label: 'Muistotilaisuus'},
                    {id: 'tuotteet', label: 'Arkku & Uurna'},
                    {id: 'kukat', label: 'Kukat'},
                    {id: 'kuljetus', label: 'Kuljetus'},
                    {id: 'kivi', label: 'Kivi'},
                    {id: 'muut', label: 'Muut palvelut'},
                ].map(osio => (
                    <button key={osio.id} onClick={() => setAktiivinenOsio(osio.id)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition ${aktiivinenOsio === osio.id ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>{osio.label}</button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                
                {/* --- 1. PERUSTIEDOT (Vainajan tiedot) --- */}
                {aktiivinenOsio === 'perus' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">Vainajan tiedot</h3> {/* MUUTETTU */}
                            
                            {/* Hallintakentät yhdistetty tähän loogisesti */}
                            <div className="flex gap-4 mb-3 p-3 bg-slate-50 rounded border border-slate-100">
                                <InputField label="Palvellut" value={valittuAsiakas.served_by} onChange={(v:any) => updateField('served_by', v)} />
                                <InputField label="Päivämäärä" type="date" value={valittuAsiakas.arrangement_date} onChange={(v:any) => updateField('arrangement_date', v)} />
                                <div className="w-full">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                                    <select className="w-full border border-slate-200 rounded p-2 text-sm bg-white" value={valittuAsiakas.status} onChange={e => updateField('status', e.target.value)}><option>Vastaanotettu</option><option>Järjestelyt käynnissä</option><option>Odottaa uurnaa</option><option>Valmis</option></select>
                                </div>
                            </div>

                            <InputField label="Koko nimi" value={valittuAsiakas.deceased_name} onChange={(v:any) => updateField('deceased_name', v)} />
                            <div className="flex gap-4"><InputField label="Syntymäpäivä" type="date" value={valittuAsiakas.date_of_birth} onChange={(v:any) => updateField('date_of_birth', v)} /><InputField label="Syntymäpaikkakunta" value={valittuAsiakas.place_of_birth} onChange={(v:any) => updateField('place_of_birth', v)} /></div>
                            <InputField label="Henkilötunnus" value={valittuAsiakas.ssn} onChange={(v:any) => updateField('ssn', v)} />
                            <div className="flex gap-4"><InputField label="Kuollut pvm" type="date" value={valittuAsiakas.date_of_death} onChange={(v:any) => updateField('date_of_death', v)} /><InputField label="Kuolinpaikkakunta" value={valittuAsiakas.place_of_death_city} onChange={(v:any) => updateField('place_of_death_city', v)} /></div>
                            <div className="flex gap-4"><InputField label="Missä kuollut" value={valittuAsiakas.place_of_death_hospital} onChange={(v:any) => updateField('place_of_death_hospital', v)} /><InputField label="Osasto (vapaa valinta)" value={valittuAsiakas.place_of_death_dept} onChange={(v:any) => updateField('place_of_death_dept', v)} /></div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">Omaisen tiedot</h3>
                            <div className="flex gap-4"><InputField label="Sukulaisuus" value={valittuAsiakas.nok_relation} onChange={(v:any) => updateField('nok_relation', v)} /><InputField label="Nimi" value={valittuAsiakas.nok_name} onChange={(v:any) => updateField('nok_name', v)} /></div>
                            <InputField label="Osoite" value={valittuAsiakas.nok_address} onChange={(v:any) => updateField('nok_address', v)} />
                            <div className="flex gap-4"><InputField label="Puhelin" value={valittuAsiakas.nok_phone} onChange={(v:any) => updateField('nok_phone', v)} /><InputField label="Sähköposti" value={valittuAsiakas.nok_email} onChange={(v:any) => updateField('nok_email', v)} /></div>
                            <InputField label="Omaisen Hetu" value={valittuAsiakas.nok_ssn} onChange={(v:any) => updateField('nok_ssn', v)} />

                            {/* OIKEUKSIEN HALLINTA */}
                            <div className="bg-slate-50 p-4 rounded-lg mt-8 border border-slate-100">
                                <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Käyttäjätunnukset (Omaiset/Vieraat/Kuljettajat)</h3>
                                <div className="flex flex-col gap-2 mb-3">
                                    <input className="w-full border border-slate-200 rounded p-1.5 text-xs" placeholder="Email (Tunnus)" value={uusiEmail} onChange={e => setUusiEmail(e.target.value)} />
                                    <div className="flex gap-2">
                                        <input className="w-20 border border-slate-200 rounded p-1.5 text-xs" placeholder="Koodi" value={uusiKoodi} onChange={e => setUusiKoodi(e.target.value)} />
                                        <select className="flex-1 border border-slate-200 rounded p-1.5 text-xs" value={uusiRooli} onChange={e => setUusiRooli(e.target.value)}>
                                            <option value="vieras">Vieras</option>
                                            <option value="omainen">Omainen</option>
                                            <option value="kuljetus">Kuljettaja</option>
                                        </select>
                                    </div>
                                    {uusiRooli === 'kuljetus' && <input className="w-full border border-slate-200 rounded p-1.5 text-xs" placeholder="Yritys (TÄRKEÄ: esim. Kuljetus Oy)" value={uusiYritys} onChange={e => setUusiYritys(e.target.value)} />}
                                    <button onClick={lisaaKayttaja} className="bg-slate-800 text-white px-2 py-2 rounded text-xs font-bold w-full hover:bg-black">Lisää tunnus</button>
                                </div>
                                <div className="space-y-1">
                                    {oikeudet.map(o => (
                                        <div key={o.id} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-slate-100">
                                            <span className="truncate max-w-[100px]">{o.email}</span>
                                            <span className="font-mono text-slate-500">{o.code}</span>
                                            <span className="font-bold uppercase text-[10px] bg-slate-100 px-1 rounded">{o.role}</span>
                                            <button onClick={() => poistaKayttaja(o.id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 2. HAUTAUS (MUUTETTU) --- */}
                {aktiivinenOsio === 'hautaus' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">Yleiset</h3>
                            <div className="bg-slate-50 p-4 rounded-lg mb-4">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">3. Hautaustapa</label>
                                <select className="w-full border border-slate-200 rounded p-2 text-sm mb-3" value={valittuAsiakas.burial_method || 'Arkkuhautaus'} onChange={e => updateField('burial_method', e.target.value)}><option>Arkkuhautaus</option><option>Tuhkaus</option><option>Muu</option></select>
                                <InputField label="4. Veteraani (Ale ja numero)" value={valittuAsiakas.veteran_status} onChange={(v:any) => updateField('veteran_status', v)} />
                                <CheckboxField label="Lääketieteellinen avaus" checked={valittuAsiakas.autopsy} onChange={(v:any) => updateField('autopsy', v)} />
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">Kirkolliset</h3> {/* MUUTETTU */}
                            <div className="flex gap-4">
                                <div className="w-1/2"><CheckboxField label="Siunaaminen" checked={valittuAsiakas.is_blessing} onChange={(v:any) => updateField('is_blessing', v)} /></div>
                                <div className="w-1/2"><CheckboxField label="Kuuluttaminen" checked={valittuAsiakas.is_announcement} onChange={(v:any) => updateField('is_announcement', v)} /></div>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-lg mt-4">
                                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">7. Hauta</h4>
                                <InputField label="Ketä siunattu hautaan" value={valittuAsiakas.grave_who_buried} onChange={(v:any) => updateField('grave_who_buried', v)} />
                                <InputField label="Seurakunta" value={valittuAsiakas.parish} onChange={(v:any) => updateField('parish', v)} />
                                <InputField label="Hautapaikka" value={valittuAsiakas.grave_place} onChange={(v:any) => updateField('grave_place', v)} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">8. Missä siunataan</h3>
                            <InputField label="Kappeli / Kirkko" value={valittuAsiakas.location_name} onChange={(v:any) => updateField('location_name', v)} />
                            <InputField label="Osoite" value={valittuAsiakas.location_address} onChange={(v:any) => updateField('location_address', v)} />
                            <InputField label="Pvm ja Kellonaika" type="datetime-local" value={valittuAsiakas.ceremony_date ? new Date(valittuAsiakas.ceremony_date).toISOString().slice(0, 16) : ''} onChange={(v:any) => updateField('ceremony_date', v)} />
                            <InputField label="Huomiot (Siunaus)" type="textarea" value={valittuAsiakas.ceremony_notes} onChange={(v:any) => updateField('ceremony_notes', v)} />

                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 mt-8 uppercase">11. Pappi & Kanttori</h3>
                            <div className="flex gap-4"><InputField label="Pappi (Nimi)" value={valittuAsiakas.priest_name} onChange={(v:any) => updateField('priest_name', v)} /><InputField label="Pappi (Puh)" value={valittuAsiakas.priest_phone} onChange={(v:any) => updateField('priest_phone', v)} /></div>
                            <div className="flex gap-4"><InputField label="Kanttori (Nimi)" value={valittuAsiakas.cantor_name} onChange={(v:any) => updateField('cantor_name', v)} /><InputField label="Kanttori (Puh)" value={valittuAsiakas.cantor_phone} onChange={(v:any) => updateField('cantor_phone', v)} /></div>

                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 mt-8 uppercase">9. Uurnanlasku / Sirottelu</h3>
                            <InputField label="Lähtöpaikka" value={valittuAsiakas.urn_handover_location} onChange={(v:any) => updateField('urn_handover_location', v)} />
                            <InputField label="Aika" type="datetime-local" value={valittuAsiakas.urn_handover_time} onChange={(v:any) => updateField('urn_handover_time', v)} />
                            <InputField label="Uurnan kuljetus / Haku" value={valittuAsiakas.urn_transport_details} onChange={(v:any) => updateField('urn_transport_details', v)} />
                            <InputField label="Hinta (€)" type="number" value={valittuAsiakas.urn_transport_price} onChange={(v:any) => updateField('urn_transport_price', v)} />
                        </div>
                    </div>
                )}

                {/* --- 3. MUISTOTILAISUUS --- */}
                {aktiivinenOsio === 'muisto' && (
                    <div className="max-w-2xl">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">10. Muistotilaisuus</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Paikka" value={valittuAsiakas.memorial_location_name} onChange={(v:any) => updateField('memorial_location_name', v)} />
                            <InputField label="Osoite" value={valittuAsiakas.memorial_location_address} onChange={(v:any) => updateField('memorial_location_address', v)} />
                            <InputField label="Pitopalvelu" value={valittuAsiakas.memorial_catering} onChange={(v:any) => updateField('memorial_catering', v)} />
                            <div className="col-span-2"><InputField label="Tarjoiluehdotus" type="textarea" value={valittuAsiakas.memorial_menu} onChange={(v:any) => updateField('memorial_menu', v)} /></div>
                            <div className="col-span-2"><InputField label="Huomiot" type="textarea" value={valittuAsiakas.memorial_notes} onChange={(v:any) => updateField('memorial_notes', v)} /></div>
                        </div>
                    </div>
                )}

                {/* --- 4. ARKKU & UURNA --- */}
                {aktiivinenOsio === 'tuotteet' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">12. Arkku & Uurna</h3>
                            <div className="bg-slate-50 p-6 rounded-lg mb-4"><h4 className="font-bold text-slate-700 mb-2">Arkku</h4><InputField label="Arkku (Malli)" value={valittuAsiakas.coffin_model} onChange={(v:any) => updateField('coffin_model', v)} /><InputField label="Hinta (€)" type="number" value={valittuAsiakas.coffin_price} onChange={(v:any) => updateField('coffin_price', v)} /></div>
                            <div className="bg-slate-50 p-6 rounded-lg mb-4"><h4 className="font-bold text-slate-700 mb-2">Vaatetus</h4><InputField label="Vaatetus" value={valittuAsiakas.clothing_model} onChange={(v:any) => updateField('clothing_model', v)} /><InputField label="Hinta (€)" type="number" value={valittuAsiakas.clothing_price} onChange={(v:any) => updateField('clothing_price', v)} /></div>
                            <div className="bg-slate-50 p-6 rounded-lg"><h4 className="font-bold text-slate-700 mb-2">Uurna</h4><InputField label="Uurna (Malli)" value={valittuAsiakas.urn_model} onChange={(v:any) => updateField('urn_model', v)} /><InputField label="Hinta (€)" type="number" value={valittuAsiakas.urn_price} onChange={(v:any) => updateField('urn_price', v)} /></div>
                        </div>
                    </div>
                )}

                {/* --- 5. KUKAT --- */}
                {aktiivinenOsio === 'kukat' && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-6 uppercase">13. Kukat</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg"><h4 className="font-bold text-xs uppercase mb-2">Arkulle</h4><InputField label="Selite / Nro / Kukkakauppa" type="textarea" value={valittuAsiakas.flowers_coffin} onChange={(v:any) => updateField('flowers_coffin', v)} /><InputField label="Hinta" type="number" value={valittuAsiakas.flowers_coffin_price} onChange={(v:any) => updateField('flowers_coffin_price', v)} /></div>
                            <div className="bg-slate-50 p-4 rounded-lg"><h4 className="font-bold text-xs uppercase mb-2">Uurnalle</h4><InputField label="Selite" value={valittuAsiakas.flowers_urn} onChange={(v:any) => updateField('flowers_urn', v)} /><InputField label="Hinta" type="number" value={valittuAsiakas.flowers_urn_price} onChange={(v:any) => updateField('flowers_urn_price', v)} /></div>
                            <div className="flex gap-4 border p-4 rounded border-slate-100"><InputField label="Vainajan käteen (Teksti)" value={valittuAsiakas.flowers_hand} onChange={(v:any) => updateField('flowers_hand', v)} /><InputField label="Hinta" type="number" width="w-24" value={valittuAsiakas.flowers_hand_price} onChange={(v:any) => updateField('flowers_hand_price', v)} /></div>
                            <div className="flex gap-4 border p-4 rounded border-slate-100"><InputField label="Alttarille (Hinta)" type="number" value={valittuAsiakas.flowers_altar_price} onChange={(v:any) => updateField('flowers_altar_price', v)} /></div>
                            <div className="flex gap-4 border p-4 rounded border-slate-100"><InputField label="Muistopöydälle (Hinta)" type="number" value={valittuAsiakas.flowers_memory_price} onChange={(v:any) => updateField('flowers_memory_price', v)} /></div>
                            <div className="flex gap-4 border p-4 rounded border-slate-100"><InputField label="Tarjoilupöydälle (Hinta)" type="number" value={valittuAsiakas.flowers_service_price} onChange={(v:any) => updateField('flowers_service_price', v)} /></div>
                        </div>
                        <h4 className="font-bold text-xs uppercase mt-8 mb-4">Omaisten kukat & Värssyt (Hinta & Nro)</h4>
                        <div className="space-y-2">
                            <InputField label="Omaiset 1 (Hinta, Värssy nro)" value={valittuAsiakas.flowers_relatives_1} onChange={(v:any) => updateField('flowers_relatives_1', v)} />
                            <InputField label="Omaiset 2 (Hinta, Värssy nro)" value={valittuAsiakas.flowers_relatives_2} onChange={(v:any) => updateField('flowers_relatives_2', v)} />
                            <InputField label="Omaiset 3 (Hinta, Värssy nro)" value={valittuAsiakas.flowers_relatives_3} onChange={(v:any) => updateField('flowers_relatives_3', v)} />
                            <InputField label="Omaiset 4 (Hinta, Värssy nro)" value={valittuAsiakas.flowers_relatives_4} onChange={(v:any) => updateField('flowers_relatives_4', v)} />
                        </div>
                    </div>
                )}

                {/* --- 6. KULJETUS --- */}
                {aktiivinenOsio === 'kuljetus' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">Logistiikka</h3>
                            <InputField label="15. Kantajat / Kuljetus tuhkaukseen" type="textarea" placeholder="Autoonkanto/Alttarille, Kantajien määrä/hinta" value={valittuAsiakas.bearers_info} onChange={(v:any) => updateField('bearers_info', v)} />
                            
                            <div className="bg-blue-50 p-6 rounded-lg mt-6 border border-blue-100">
                                <h4 className="font-bold text-sm text-blue-900 uppercase mb-4">22. Kuljetus (Saatto / Näyttö)</h4>
                                
                                <div className="mb-4">
                                    <CheckboxField label="Omaiset mukana kuljetuksessa" checked={valittuAsiakas.transport_relatives_included} onChange={(v:any) => updateField('transport_relatives_included', v)} />
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <InputField label="Reitti (Mistä - Minne)" placeholder="Sairaala - Kappeli" value={valittuAsiakas.transport_route} onChange={(v:any) => updateField('transport_route', v)} />
                                    <InputField label="Päivämäärä ja Kellonaika" type="datetime-local" value={valittuAsiakas.transport_time} onChange={(v:any) => updateField('transport_time', v)} />
                                    <InputField label="Hinta (€)" type="number" value={valittuAsiakas.transport_price} onChange={(v:any) => updateField('transport_price', v)} />
                                    <InputField label="Lisätiedot" type="textarea" placeholder="Muuta huomioitavaa..." value={valittuAsiakas.transport_details} onChange={(v:any) => updateField('transport_details', v)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 7. KIVI --- */}
                {aktiivinenOsio === 'kivi' && (
                    <div className="max-w-2xl">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">14. Kivi</h3>
                        <div className="space-y-4">
                            <InputField label="Kiviliike" value={valittuAsiakas.stone_company} onChange={(v:any) => updateField('stone_company', v)} />
                            <InputField label="Kivessä lukee (Nimi, syntymä, kuolin)" type="textarea" value={valittuAsiakas.stone_existing_text} onChange={(v:any) => updateField('stone_existing_text', v)} />
                            <InputField label="Kaiverrus (Lisätään: Nimi, syntymä, kuolin)" type="textarea" value={valittuAsiakas.stone_engraving} onChange={(v:any) => updateField('stone_engraving', v)} />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Laatta muistolehtoon" value={valittuAsiakas.stone_plate} onChange={(v:any) => updateField('stone_plate', v)} />
                                <InputField label="Ensiristi" value={valittuAsiakas.stone_cross} onChange={(v:any) => updateField('stone_cross', v)} />
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg"><InputField label="Hinta (€)" type="number" value={valittuAsiakas.stone_price} onChange={(v:any) => updateField('stone_price', v)} /></div>
                        </div>
                    </div>
                )}

                {/* --- 8. MUUT PALVELUT --- */}
                {aktiivinenOsio === 'muut' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">Muut Palvelut</h3>
                            <div className="flex gap-4"><InputField label="16. Haudan havutus (Uurna/Arkku)" value={valittuAsiakas.grave_decoration} onChange={(v:any) => updateField('grave_decoration', v)} /><InputField label="Hinta" type="number" width="w-24" value={valittuAsiakas.grave_decoration_price} onChange={(v:any) => updateField('grave_decoration_price', v)} /></div>
                            <InputField label="17. Ilmoitukset (Kuolin/Kiitos)" value={valittuAsiakas.newspaper_ads} onChange={(v:any) => updateField('newspaper_ads', v)} />
                            <CheckboxField label="18. Kappelinkoristelu" checked={valittuAsiakas.chapel_decoration} onChange={(v:any) => updateField('chapel_decoration', v)} />
                            <InputField label="19. Musiikkiohjelma" value={valittuAsiakas.music_program} onChange={(v:any) => updateField('music_program', v)} />
                            <InputField label="20. Videokuvaus" value={valittuAsiakas.video_recording} onChange={(v:any) => updateField('video_recording', v)} />
                            <InputField label="21. Hautausohjelma (Materiaali, määrä, hinta)" value={valittuAsiakas.funeral_program_details} onChange={(v:any) => updateField('funeral_program_details', v)} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 uppercase">Talous & Hallinta</h3>
                            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
                                <InputField label="23. Järjestelykulut (Hinta)" type="number" value={valittuAsiakas.arrangement_fee} onChange={(v:any) => updateField('arrangement_fee', v)} />
                                <div className="h-px bg-yellow-200 my-4"></div>
                                <InputField label="24. Perunkirjoitus (Pvm/Aika)" type="datetime-local" value={valittuAsiakas.estate_inventory_time} onChange={(v:any) => updateField('estate_inventory_time', v)} />
                            </div>
                        </div>
                    </div>
                )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}