export const rabbitOptions = {
  host: 'rabbit',
  login: process.env.RABBIT_USER,
  password: process.env.RABBIT_PASSWORD,
  vhost: process.env.RABBIT_VHOST,
};
