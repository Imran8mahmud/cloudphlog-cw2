// Logic Apps REST API endpoints
const API_URLS = {
  getAll: "https://prod-09.spaincentral.logic.azure.com/workflows/9b1299caa5e74794b6ccef4f57b30b9e/triggers/HTTP/paths/invoke/soundscapes?api-version=2016-10-01&sp=%2Ftriggers%2FHTTP%2Frun&sv=1.0&sig=iZAGCsFFEg8-ZNYioyUakQV8QmzhJz8gvsmD8bCxCAE",
  getSingle: "https://prod-10.spaincentral.logic.azure.com/workflows/fc78c494c82b4b598b48d58ac58ac077/triggers/manual/paths/invoke/soundscapes/{id}?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=1AmOBVOVTXaDephgofVUXI0Gu-rJpCw3lDZUyD52McE",
  create: "https://prod-11.spaincentral.logic.azure.com/workflows/9da322a067a24cd5a494dae73e373342/triggers/manual/paths/invoke/soundscapes?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3cdfmo1p6uKGsgXwhtxZxa5IcGLeYLDtADK0wkpkEzQ",
  update: "https://prod-06.spaincentral.logic.azure.com/workflows/3078da0084d54b818fb9b72c0136088f/triggers/manual/paths/invoke/soundscapes/{id}?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=WerZmMj6ddFf0FJjKFBupU_kN0qgj6RqR9BGB4vtiTk",
  delete: "https://prod-14.spaincentral.logic.azure.com/workflows/a8db39a5a488467a88a196fbb067db03/triggers/manual/paths/invoke/soundscapes/{id}?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=1xlPOyp5xeyN7y5W9U00fUN_LxFTVxZXuWf7yPXwWls"
};

// Brand colors from CW1
export const BRAND = {
  teal: '#00E5A0',
  azure: '#00B4D8',
  violet: '#8B5CF6',
  navy: '#0a1628',
  navyDeep: '#050a14',
  navyLight: '#152238',
};

// Categories from CW1 wireframe
export const CATEGORIES = ['Nature', 'Music', 'Water', 'Ambient'];

export default API_URLS;
