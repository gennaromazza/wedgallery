import sgMail from '@sendgrid/mail';

// Inizializza SendGrid con la tua API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY non trovata nelle variabili di ambiente!');
}

interface SendPasswordEmailParams {
  galleryName: string;
  galleryCode: string;
  galleryPassword: string;
  recipientEmail: string;
  recipientName: string;
  siteUrl: string;
}

/**
 * Invia un'email con la password della galleria all'utente
 */
export async function sendPasswordEmail({
  galleryName,
  galleryCode,
  galleryPassword,
  recipientEmail,
  recipientName,
  siteUrl = 'https://memorie-sospese.it'
}: SendPasswordEmailParams): Promise<boolean> {
  try {
    // Costruisci l'URL della galleria
    const galleryUrl = `${siteUrl}/gallery/${galleryCode}`;
    
    // Prepara i dati dell'email
    const msg = {
      to: recipientEmail,
      from: 'notifiche@memorie-sospese.it', // Cambia con la tua email verificata su SendGrid
      subject: `Password per la galleria: ${galleryName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #4a5568;">
          <h2 style="color: #536b7a; font-family: 'Playfair Display', serif;">Memorie Sospese</h2>
          <p>Gentile ${recipientName},</p>
          <p>grazie per la tua richiesta di accesso alla galleria fotografica "${galleryName}".</p>
          <p>Ecco i dati per accedere:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p><strong>Galleria:</strong> ${galleryName}</p>
            <p><strong>Password:</strong> ${galleryPassword}</p>
          </div>
          <p>Puoi accedere alla galleria utilizzando questo link: <a href="${galleryUrl}" style="color: #536b7a;">Apri Galleria</a></p>
          <p>La password ti consentirà di visualizzare tutte le foto della galleria.</p>
          <p>Cordiali saluti,<br>Team Memorie Sospese</p>
        </div>
      `,
    };
    
    // Invia l'email
    await sgMail.send(msg);
    console.log(`Email inviata con successo a ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    return false;
  }
}