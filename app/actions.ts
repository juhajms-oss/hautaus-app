'use server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function lahetaSahkoposti(aihe: string, viesti: string, vastaanottaja: string) {
  try {
    // TÄRKEÄÄ: Resendin ilmaisversiossa voit lähettää vain OMAAN sähköpostiisi!
    // Kun olet ostanut domainin, voit vaihtaa 'from'-osoitteen oikeaksi.
    const data = await resend.emails.send({
      from: 'Hautaus-App <onboarding@resend.dev>', 
      to: [vastaanottaja], 
      subject: aihe,
      html: `<div style="font-family: sans-serif; white-space: pre-wrap; color: #333;">${viesti}</div>`
    })

    if (data.error) {
        console.error("Resend virhe:", data.error)
        return { success: false, error: data.error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Server virhe:", error)
    return { success: false, error: 'Lähetys epäonnistui' }
  }
}