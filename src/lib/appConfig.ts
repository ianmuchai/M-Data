export type AppConfig = {
  appName: string;
  companyName: string;
  industry: string;
  supportEmail: string;
};

export const defaultAppConfig: AppConfig = {
  appName: 'M-Data Analytics',
  companyName: 'M-Data',
  industry: 'Financial services, insurance, and enterprise operations',
  supportEmail: 'support@example.com',
};
