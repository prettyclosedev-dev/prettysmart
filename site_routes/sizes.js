const express = require('express');
const router = express.Router();

module.exports = () => {

    router.get('/:event', async (req, res) => {

        db.pages.findOne({
            type : 'event',
            _id : req.params.event
        }, function(err, event){


            let sizeQuery = {
                type : 'size'
            };

            if(event.sizes){
                let sizeIds = [];
                
                for(let id in event.sizes){
                    if(event.sizes[id]){
                        sizeIds.push(id)
                    }
                }

                if(sizeIds.length){
                    sizeQuery._id = {
                        $in : sizeIds
                    }
                }
            }
            
            db.pages.find(sizeQuery, function(err, sizes){

                sizes = _.orderBy(sizes, 'order');

                if(sizes.length <= 3){
                    sizes = _.chunk(sizes, 1)
                }else if(sizes.length <= 6){
                    sizes = _.chunk(sizes, 2)
                }else{
                    sizes = _.chunk(sizes, 3)
                }
                
                res.render('sizes', {
                    event : req.params.event,
                    sizes : sizes
                }); 
                     
            }); 

        });    

    });


    return router;
};
