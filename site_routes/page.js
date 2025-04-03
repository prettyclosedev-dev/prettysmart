const express = require('express')
const router = express.Router({mergeParams: true});
const db = require('../db');

module.exports = () => {

    router.get('/', async (req, res) => {

        let locals = {
            page: 'page',
            title : 'Page'
        };

        
        db.pages.findOne({
            type : 'page',
            slug : req.params.page
        }, function(err, page){

            if(page){
                locals.page = page;

                if(page.page_title){
                    locals.title = page.page_title;
                }else{
                    locals.title = page.name;
                }

                res.render('page', locals);
                  
            }else{
                res.render('404', locals);
            }
    
        });

    });

    return router;
};
