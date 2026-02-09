/**
 * ⭐ BACKEND URL CONFIGURATION ⭐
 * Single source of truth for backend URL
 * Change this when deploying to a new backend URL
 */

const getBackendUrl = () => {
    return process.env.BASE_URL || 'https://ziyavoice-production-5e44.up.railway.app';
};

module.exports = {
    getBackendUrl
};
