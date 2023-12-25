const express = require('express');
const router = express.Router();
const Huddle = require('../huddle');
const Account = require('../schemas/account');
const Project = require('../schemas/project');

module.exports = () => {

    router.get('/', async (req, res) => {  
        
        let accounts = [];

        if(!req.user.account.brand.logos.logo){
            return res.redirect('/onboarding/transfer')
        }

        if(req.user.master){
            accounts = await Account.find({
                isDraft : false
            });
        }
        
        db.pages.find({
            type : 'event',
            $or : [{
                dashboard : true
            },{
                popular : true
            }]
        }, function(err, events){

            db.pages.find({
                type : 'size'
            }, async function(err, sizes){
    
                events = _.orderBy(events, 'order');
                sizes = _.orderBy(sizes, 'order'); 

                let today = new Date()

                let carouselQuery = {
                    type : 'carousel',
                    $or : [{
                        start_date : null,
                        end_date : null
                    }, {
                        start_date : {
                            $lte : today
                        },
                        end_date : {
                            $gte : today
                        }
                    }, {
                        start_date : {
                            $lte : today
                        },
                        end_date : null
                    }, {
                        start_date : null,
                        end_date : {
                            $gte : today
                        }
                    }]
                };

                if(!global.isDev){
                    carouselQuery.isDev = {
                        $ne : true
                    }
                }

                db.pages.find(carouselQuery, async function(err, rows){

                    await Promise.all(rows.map(async (row) => {
                        if(row.sizes && row.sizes.length){
                            row.sizes = row.sizes.map(size => {
                                return sizes.find(s => s._id === size)
                            });
                        }

                        let rowQuery = {
                            user : req.user,
                            limit : row.random || 4,
                            category : row.category                                      
                        }

                        if(row.sizes && row.sizes.length){

                            if(!row.default_size){
                                row.default_size = row.sizes[0]._id;
                            }

                            let default_size = row.sizes.find(size => {
                                return size._id === row.default_size;
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

                        if(row.default_tag){
                            rowQuery.search = row.default_tag;
                        }
                        
                        let rowTemplates = await Huddle.getTemplates(rowQuery);
                        let templateItems = rowTemplates.data.items;

                        if(row.random){
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

                            row.templates = shuffle(randomTemplates).slice(0, 4)
                        }else{
                            row.templates = templateItems;
                        }

                    }));
        
                    let projects = await Project.find({
                        user : req.user
                    }).sort('-created_at').limit(6);
                                
                    res.render('dashboard', {
                        sizes : sizes,
                        dashboard_events : events.filter(e => e.dashboard),
                        popular_events : events.filter(e => e.popular),
                        //ready_templates : ready_templates.data.items,
                        recent_projects : projects,
                        rows: _.orderBy(rows, 'position'),
                        accounts : accounts
                    });    
                    
                })
            });

        });

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