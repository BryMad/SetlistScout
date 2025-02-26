const axios = require("axios");
const Bottleneck = require("bottleneck");
const winston = require('winston');

// Configure the Winston logger
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        // Add transports for files if needed, e.g., new winston.transports.File({ filename: 'combined.log' })
    ],
});

const limiter = new Bottleneck({
    minTime: 600, // min time between requests
    maxConcurrent: 1, // max concurrent requests
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getArtistPageByName = async (artist) => {
    logger.info('Requesting setlist artist page', { artist });
    const response = await axios.get(
        `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artist}&p=1`,
        {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.SETLIST_API_KEY,
            },
        }
    );
    logger.info('Received setlist at artist page');
    console.log("response: ", response.data);
    return response.data;

}
const getArtistPageByMBID = async (mbid) => {
    logger.info('Requesting setlist artist page by MBID:', { mbid });
    const response = await axios.get(
        `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1`,
        {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.SETLIST_API_KEY,
            },
        }
    );
    logger.info('Received setlist at artist page');
    console.log("response: ", response.data);
    return response.data;

}

const getTourName = async (listID) => {
    logger.info('Requesting tour name', { listID });
    const response = await axios.get(
        `https://api.setlist.fm/rest/1.0/setlist/${listID}`,
        {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.SETLIST_API_KEY,
            },
        }
    );
    logger.info('Received tour name data', { listID, bandName: response.data.artist.name });
    return {
        bandName: response.data.artist.name,
        tourName: response.data.tour?.name,
    };
};

const getAllTourSongs = async (artistName, tourName) => {
    logger.info('Starting to fetch all tour songs', { artistName, tourName });
    try {
        const response = await axios.get(
            `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=1&tourName=${tourName}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.SETLIST_API_KEY,
                },
            }
        );
        logger.debug('Received first page of setlist data', { artistName, tourName });

        const firstPage = response.data;
        const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
        const allData = [firstPage];
        await delay(1000);

        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
            logger.debug('Scheduling page request', { page: i });
            const request = limiter.schedule(() =>
                axios.get(
                    `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=${i}&tourName=${tourName}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": process.env.SETLIST_API_KEY,
                        },
                    }
                )
            );
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
        const response = await axios.get(
            `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1&tourName=${tourName}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.SETLIST_API_KEY,
                },
            }
        );
        logger.debug('Received first page of setlist data', { artistName, tourName });

        const firstPage = response.data;
        const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
        const allData = [firstPage];
        await delay(1000);

        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
            logger.debug('Scheduling page request', { page: i });
            const request = limiter.schedule(() =>
                axios.get(
                    `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=${i}&tourName=${tourName}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": process.env.SETLIST_API_KEY,
                        },
                    }
                )
            );
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
