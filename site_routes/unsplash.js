const express = require('express');
const router = express.Router();
const config = require('../config');
const nodeFetch = require('node-fetch');
const Unsplash = require('unsplash-js');

const unsplash = new Unsplash.createApi({
    accessKey: config.unsplash.key,
    fetch: nodeFetch
});

module.exports = () => {

    router.get('/', async (req, res) => {

        if(req.query.q){
            let photos = await unsplash.search.getPhotos({
                query : req.query.q,
                perPage : 50,
                page : req.query.page
            });
            res.send(photos.response)
        }else{
           res.send({
               error : 'Keyword is required'
           }) 
        }

    });

    router.get('/:keyword', async (req, res) => {

        if(req.params.keyword){
            try {
                let photos = await unsplash.photos.getRandom({
                    query : req.params.keyword,
                    featured: true
                });
                res.send(photos)
            } catch (error) {
                res.send(error)
            }
        }else{
           res.send({
               error : 'Keyword is required'
           }) 
        }
        

    });



    return router;
};
