const express = require('express');
const router = express.Router();
const Huddle = require('../huddle');

module.exports = () => {

    router.get('/:event/:size', async (req, res) => {

        let query = {
            type : 'form'
        }

        query[`sizes.${req.params.size}`] = true;
        query[`events.${req.params.event}`] = true;

        db.pages.findOne(query, function(err, form){
            if(form){
                res.render('form', {
                    event : req.params.event,
                    size : req.params.size,
                    form : form
                });  
            }else{                
                res.redirect('/templates');
            }
            
                
        });    

    });

    router.post('/:event/:size', async (req, res) => {
        
        req.session.content = req.body;
        req.session.random_start = -1;
        res.redirect(`/form/${req.params.event}/${req.params.size}/templates`);          

    });

    router.get('/:event/:size/templates', async (req, res) => {

        db.pages.findOne({
            type : 'event',
            _id : req.params.event
        }, async function(err, event){

            db.pages.findOne({
                type : 'size',
                _id : req.params.size
            }, async function(err, size){
    
                let body = req.body;
                let keys = Object.keys(body);    
                let limit = 1;        
    
                keys = keys.map(key => key[0]);
                keys = keys.join('');   
                
                let template_query = {
                    user: req.user, 
                    event: event, 
                    size: size, 
                    keys: keys,
                    page : req.query.page,
                    limit : limit,
                    form_file : req.session.content.form_file              
                };
                let templates;
                
                if(!_.isNumber(req.session.random_start) || req.session.random_start < 0){
                    
                    templates = await Huddle.getTemplates(template_query);
                    template_query.page = Math.floor(Math.random() * templates.data.total);  
                    req.session.random_start = template_query.page;
                    console.log(req.session.random_start, templates.data.total)
                }

                templates = await Huddle.getTemplates(template_query);

                let hasMoreDesigns = templates.data.total > (templates.data.page * limit);
                res.render('smart-templates', {
                    event : event,
                    size : size,
                    templates : templates.data.items, 
                    total : templates.data.total,
                    page : templates.data.page, 
                    limit : limit,                   
                    next : hasMoreDesigns ? (templates.data.page+1) : 1
                }); 
                     
            }); 
                 
        }); 

    });


    return router;
};
