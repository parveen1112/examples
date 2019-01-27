/* eslint complexity: [0] */
/**
 * Middleware to write response back to client
 */

const url = require('url');
const renderToString = require('preact-render-to-string');
const { h } = require('preact');
const manifest = require('../../public/live/manifest');
const generateVDom = require('../../public/live/server/app').default;
const _ = require('lodash');

const responseFactory = (req, res, next) => {
    if (!req.routeExist) return next();
    const data = res.props('data');
    const options = res.props('viewConfig');
    const { locals: { _csrf: csrfToken } } = res;
    const { routerConfig, headers, originalUrl } = req;
    const { domain = '', responseType = 'json', schema = {} } = routerConfig;
    const { pathname, search, hash } = url.parse(originalUrl);
    const jsonResponse = req.headers['x-client-response'];
    const flow = domain;
    let finalRes = data;

    // Set status code
    res.status(200);

    const preLoadedState = {
        flow,
        csrfToken,
        [flow]: { ...finalRes, originalUrl }
    };


    if (req.headers['x-client-response'] === 'json' || responseType === 'json') {
        console.timeEnd('responseFactory');
        return res.json(preLoadedState);
    }

    // If a view was provided in options, serve it.
    // Otherwise try to guess an appropriate view, or if that doesn't
    // work, just send JSON.
    if (options && jsonResponse !== 'json' && responseType !== 'json') {
        const { view } = options;
        let ssrHtml = '';

        res.locals.flow = flow;
        res.locals.preLoadedStateForClient = JSON.stringify(preLoadedState).replace(/</g, '\\u003c');
        res.locals.manifest = manifest;

        try {
            const options = {
                location: {
                    pathname,
                    search,
                    hash,
                    url: originalUrl,
                },
                flow,
                isSSR: true
            };
            const vdom = generateVDom(req, options, preLoadedState);
            ssrHtml = renderToString(vdom);
        } catch (e) {
            console.log(e);
            return res.view(view, { ssrHtml })
        }
        if (view) return res.view(view, { ssrHtml });
    }
};

module.exports = responseFactory;