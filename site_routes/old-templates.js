const express = require('express');
const router = express.Router();
const Huddle = require('../huddle');

module.exports = () => {

    router.get('/:category?', async (req, res) => {
        
        if(req.query.row){
            db.pages.findOne({
                _id : req.query.row,
                type : 'carousel'
            }, async function(err, row){                

                db.pages.find({
                    type : 'size'
                }, async function(err, sizes){

                    if(row.sizes && row.sizes.length){
                        row.sizes = row.sizes.map(size => {
                            return sizes.find(s => s._id === size)
                        });
                    }                    

                    let rowQuery = {
                        user : req.user,
                        limit : req.query.limit ? (row.random || req.query.limit) : 48,
                        page : req.query.page || 1,
                        category : req.params.category,
                        search: req.query.search
                    }

                    if(req.query.size && row.sizes && row.sizes.length){
                    
                        let default_size = row.sizes.find(size => {
                            return size._id === req.query.size;
                        });

                        
                        if(default_size){
                            rowQuery.size = {
                                width: default_size.width,
                                height : default_size.height
                            }
                        }else{
                            rowQuery.size = {
                                width: row.sizes[0].width,
                                height : row.sizes[0].height
                            }
                        }                       
                         
                    }

                    let templates = await Huddle.getTemplates(rowQuery);

                    let templateItems = templates.data.items;


                    if(row.random && req.query.limit){
                        rowQuery.limit = req.query.limit;

                        let randomTemplates = [];
                        let randomTemplatesGroups = {};

                        templateItems.forEach(template => {

                            if(template.template_title.indexOf('#') > -1){
                                let templateHash = template.template_title.split('#')[1][0];
                                if(!randomTemplatesGroups[templateHash]){
                                    randomTemplatesGroups[templateHash] = [];
                                }

                                randomTemplatesGroups[templateHash].push(template);
                                
                            }else{
                                randomTemplates.push(template);
                            }
                            
                        });

                        for(templateHash in randomTemplatesGroups){
                            let randomTemplate = shuffle(randomTemplatesGroups[templateHash])[0];
                            randomTemplates.push(randomTemplate);
                        }

                        templateItems = shuffle(randomTemplates).slice(0, 4)
                    }
                 
                    sizes = _.orderBy(sizes, 'order'); 
                    res.render('old-templates', {
                        row : row,
                        sizes : row.sizes,
                        tags : row.tags,
                        default_size : req.query.size || row.default_size,
                        default_tag : req.query.search || row.default_tag,
                        category : req.params.category,
                        templates : templateItems,
                        total : templates.data.total,
                        pages : Math.ceil(templates.data.total / Number(rowQuery.limit)),
                        limit : rowQuery.limit,
                        current : templates.data.page
                    }); 
                        
                }); 

            })
        }else if(req.params.category){
            let rowQuery = {
                user : req.user,
                limit : 48,
                page : req.query.page || 1,
                category : req.params.category
            }
            let templates = await Huddle.getTemplates(rowQuery);

            let templateItems = templates.data.items;

            templateItems = shuffle(templateItems).slice(0, 4);

            res.render('old-templates', {
                row : {},
                category : req.params.category,
                templates : templateItems,
                total : templates.data.total,
                pages : Math.ceil(templates.data.total / Number(rowQuery.limit)),
                limit : rowQuery.limit,
                current : templates.data.page
            }); 
            
        }else{
            res.redirect('back')
        }  
         

    });

    router.get('/export/:project', async function(req, res){

        let project_export_job = await Huddle.newExportJob({
            user : req.user,
            project : req.params.project,
            format : req.query.file_type,
            filename : req.query.file_name,
            cropmarks : req.query.file_crop
        });
        
        res.redirect(`/old-templates/export/${req.params.project}/${project_export_job.data.job_id}`)

    });

    router.get('/export/:project/:job', async function(req, res){

        let project_export_job = await Huddle.getExportJob({
            user : req.user,
            project : req.params.project,
            job : req.params.job
        });

        res.send({
            data : Object.assign({
                link : '/old-templates/' + req.path
            }, project_export_job.data)
        })
        
    });

    return router;
};

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}