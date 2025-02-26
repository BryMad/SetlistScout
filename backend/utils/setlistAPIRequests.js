const axios = require("axios");
const Bottleneck = require("bottleneck");
const winston = require('winston');

// Configure the Winston logger
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        // Additional transports can be added here.
    ],
});

const limiter = new Bottleneck({
    minTime: 600, // minimum time (ms) between requests
    maxConcurrent: 1, // maximum concurrent requests
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A helper function that wraps axios.get with retry logic.
 * If a 429 (Too Many Requests) error is encountered, it will wait (with exponential backoff) and retry.
 *
 * @param {string} url - The URL to request.
 * @param {object} config - The axios configuration object.
 * @param {number} retries - Number of retry attempts (default 3).
 * @param {number} backoff - Initial backoff delay in ms (default 1000).
 */
const axiosGetWithRetry = async (url, config, retries = 3, backoff = 1000) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await axios.get(url, config);
        } catch (error) {
            // Check if the error is a 429 (Too Many Requests)
            if (error.response && error.response.status === 429 && attempt < retries) {
                logger.warn(`429 error received, retrying attempt ${attempt + 1} for URL: ${url}`);
                await delay(backoff);
                backoff *= 2; // Exponential backoff
                continue;
            } else {
                throw error;
            }
        }
    }
};

// Raw functions for the artist page requests.
const getArtistPageByNameRaw = async (artist) => {
    logger.info('Requesting setlist artist page', { artist });
    const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artist}&p=1`;
    const response = await axiosGetWithRetry(url, {
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
        },
    });
    logger.info('Received setlist at artist page');
    return response.data;
};

const getArtistPageByMBIDRaw = async (mbid) => {
    logger.info('Requesting setlist artist page by MBID:', { mbid });
    const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1`;
    const response = await axiosGetWithRetry(url, {
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
        },
    });
    logger.info('Received setlist at artist page');
    return response.data;
};

// Wrap the raw functions so that each call is automatically rate-limited.
const getArtistPageByName = limiter.wrap(getArtistPageByNameRaw);
const getArtistPageByMBID = limiter.wrap(getArtistPageByMBIDRaw);

const getTourName = async (listID) => {
    logger.info('Requesting tour name', { listID });
    const url = `https://api.setlist.fm/rest/1.0/setlist/${listID}`;
    const response = await axiosGetWithRetry(url, {
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
        },
    });
    logger.info('Received tour name data', { listID, bandName: response.data.artist.name });
    return {
        bandName: response.data.artist.name,
        tourName: response.data.tour?.name,
    };
};

const getAllTourSongs = async (artistName, tourName) => {
    logger.info('Starting to fetch all tour songs', { artistName, tourName });
    try {
        // Rate-limit the first page request as well.
        const firstResponse = await limiter.schedule(() => {
            const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=1&tourName=${tourName}`;
            return axiosGetWithRetry(url, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.SETLIST_API_KEY,
                },
            });
        });
        logger.debug('Received first page of setlist data', { artistName, tourName });

        const firstPage = firstResponse.data;
        const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
        const allData = [firstPage];
        await delay(1000);

        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
            logger.debug('Scheduling page request', { page: i });
            const request = limiter.schedule(() => {
                const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=${i}&tourName=${tourName}`;
                return axiosGetWithRetry(url, {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": process.env.SETLIST_API_KEY,
                    },
                });
            });
            promises.push(request);
        }

        const additionalResponses = await Promise.all(promises);
        additionalResponses.forEach((resp, index) => {
            logger.debug('Received additional page of setlist data', { page: index + 2 });
            allData.push(resp.data);
        });

        return allData;
    } catch (error) {
        logger.error('Error fetching tour songs', {
            artistName,
            tourName,
            error: error.message,
            statusCode: error.response?.status || 500,
            statusText: error.response?.statusText || 'Internal Server Error',
        });
        return {
            statusCode: error.response?.status || 500,
            message: error.response?.statusText || 'Internal Server Error',
        };
    }
};

const getAllTourSongsByMBID = async (artistName, mbid, tourName) => {
    logger.info('Starting to fetch all tour songs by MBID', { artistName, tourName });
    try {
        const firstResponse = await limiter.schedule(() => {
            const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1&tourName=${tourName}`;
            return axiosGetWithRetry(url, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.SETLIST_API_KEY,
                },
            });
        });
        logger.debug('Received first page of setlist data', { artistName, tourName });

        const firstPage = firstResponse.data;
        const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
        const allData = [firstPage];
        await delay(1000);

        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
            logger.debug('Scheduling page request', { page: i });
            const request = limiter.schedule(() => {
                const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=${i}&tourName=${tourName}`;
                return axiosGetWithRetry(url, {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": process.env.SETLIST_API_KEY,
                    },
                });
            });
            promises.push(request);
        }

        const additionalResponses = await Promise.all(promises);
        additionalResponses.forEach((resp, index) => {
            logger.debug('Received additional page of setlist data', { page: index + 2 });
            allData.push(resp.data);
        });

        return allData;
    } catch (error) {
        logger.error('Error fetching tour songs', {
            artistName,
            tourName,
            error: error.message,
            statusCode: error.response?.status || 500,
            statusText: error.response?.statusText || 'Internal Server Error',
        });
        return {
            statusCode: error.response?.status || 500,
            message: error.response?.statusText || 'Internal Server Error',
        };
    }
};

module.exports = { getArtistPageByMBID, getArtistPageByName, getTourName, getAllTourSongs, getAllTourSongsByMBID, delay };
