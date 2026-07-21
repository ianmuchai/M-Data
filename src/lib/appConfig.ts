export type AppConfig = {
  appName: string;
  companyName: string;
  industry: string;
  supportEmail: string;
};

export const defaultAppConfig: AppConfig = {
  appName: '',
  companyName: 'BizDATA',
  industry: 'Financial services, insurance, and enterprise operations',
  supportEmail: 'support@example.com',
};

