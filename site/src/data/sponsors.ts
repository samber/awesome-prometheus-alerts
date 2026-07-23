export interface Sponsor {
  name: string;
  url: string;
  logo: string;
  description: string;
}

export const sponsors: Sponsor[] = [
  {
    name: 'CAST AI',
    url: 'https://cast.ai/samuel',
    logo: '/images/sponsor-cast-ai.png',
    description: 'Kubernetes cost optimization',
  },
  {
    name: 'Better Stack',
    url: 'https://betterstack.com/',
    logo: '/images/sponsor-betterstack.png',
    description: 'Uptime monitoring and log management',
  },
  {
    name: 'VictoriaMetrics',
    url: 'https://victoriametrics.com/',
    logo: '/images/sponsor-victoriametrics.png',
    description: 'Fast, open-source time series database and drop-in Prometheus replacement.',
  },
];
