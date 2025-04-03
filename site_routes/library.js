const fs = require('fs');
const formidable = require('formidable');
const File = require('../schemas/file');
const express = require('express');
const router = express.Router();
const config = require('../config.json');

module.exports = () => {

    router.get('/', async (req, res) => {
        res.send('Files')
    })
    
    router.post('/upload', async (req, res) => {

        if(!req.files.file){
            return res.send({
                error : 'Error uploading image'
            })
        }

        let path = __dirname + '/../files/' + req.user.account._id;
        let fileName = Date.now() + '__' + req.files.file.name;
        let newFile = new File({
            user : req.user._id,
            account : req.user.account._id,
            name: fileName,
            type : req.files.file.mimetype,
            ext : fileName.split('.').pop()
        });    	

        if(!fs.existsSync(path)){
            fs.mkdirSync(path);
        }

        let upload_path = path + '/' + fileName;

        req.files.file.mv(upload_path, () => {
            newFile.save().then(function(doc){
                res.send({
					path : config.BASE_URL + '/files/' + req.user.account._id + '/' + doc.name, // https://prettyclose.co
					file : doc
				});
            }).catch(function(e){
                res.send(e);
            })
        });


    });

    return router;

};
