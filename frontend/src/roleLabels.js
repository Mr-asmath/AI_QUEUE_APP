export const roleLabelOptionsByIndustry = {
  hospital: {
    industry_admin: ['Manager', 'Hospital Admin', 'Clinic Manager'],
    queue_operator: ['Token Desk Staff', 'Front Office Staff', 'Reception Staff'],
    service_provider: ['Doctor', 'Nurse', 'Consultant']
  },
  school: {
    industry_admin: ['Principal', 'School Admin', 'College Admin'],
    queue_operator: ['Front Office Staff', 'Admission Desk Staff', 'Reception Staff'],
    service_provider: ['Teacher', 'Faculty', 'Counsellor']
  },
  bank: {
    industry_admin: ['Branch Manager', 'Bank Manager', 'Operations Manager'],
    queue_operator: ['Token Counter Staff', 'Counter Staff', 'Front Desk Staff'],
    service_provider: ['Bank Official', 'Teller', 'Relationship Officer']
  },
  hotel: {
    industry_admin: ['Hotel Manager', 'Property Manager', 'Operations Manager'],
    queue_operator: ['Receptionist', 'Front Desk Staff', 'Guest Desk Staff'],
    service_provider: ['Service Staff', 'Service Manager', 'Guest Service Executive']
  },
  office: {
    industry_admin: ['Office Manager', 'Company Admin', 'Operations Manager'],
    queue_operator: ['Front Desk Executive', 'Reception Executive', 'Help Desk Staff'],
    service_provider: ['Executive', 'Consultant', 'Advisor']
  },
  government: {
    industry_admin: ['Department Admin', 'Department Manager', 'Office Superintendent'],
    queue_operator: ['Service Counter Staff', 'Public Counter Staff', 'Token Counter Staff'],
    service_provider: ['Officer', 'Clerk', 'Service Officer']
  },
  other: {
    industry_admin: ['Manager', 'Admin', 'Supervisor'],
    queue_operator: ['Token Desk Staff', 'Front Desk Staff', 'Counter Staff'],
    service_provider: ['Service Provider', 'Specialist', 'Consultant']
  }
};

export const normalizeIndustryType = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (['school', 'college'].includes(normalized)) return 'school';
  if (['hotel', 'hotal'].includes(normalized)) return 'hotel';
  if (['office', 'company'].includes(normalized)) return 'office';
  if (['government', 'government office'].includes(normalized)) return 'government';
  return roleLabelOptionsByIndustry[normalized] ? normalized : 'other';
};

export const roleLabelOptions = (industryType) => (
  roleLabelOptionsByIndustry[normalizeIndustryType(industryType)] || roleLabelOptionsByIndustry.other
);

export const roleLabelsFor = (industryType, configured = {}) => {
  const options = roleLabelOptions(industryType);
  return {
    main_admin: 'Main Admin',
    industry_admin: configured.industry_admin || options.industry_admin[0],
    queue_operator: configured.queue_operator || options.queue_operator[0],
    service_provider: configured.service_provider || options.service_provider[0],
    doctor: configured.service_provider || options.service_provider[0],
    user: 'User'
  };
};
