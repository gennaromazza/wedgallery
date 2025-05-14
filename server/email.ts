interface SendPasswordEmailParams {
  galleryName: string;
  galleryCode: string;
  galleryPassword: string;
  recipientEmail: string;
  recipientName: string;
  siteUrl: string;
}

export const sendPasswordEmail = async (params: SendPasswordEmailParams) => {
  // Placeholder for future email implementation
  console.log('Email would be sent with params:', params);
  return true;
};