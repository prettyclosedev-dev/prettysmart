const fs = require("fs");
const formidable = require("formidable");
const File = require("../schemas/file");
const express = require("express");
const router = express.Router();
const config = require("../config.json");
const path = require("path");

module.exports = () => {
  router.get("/:filename", async (req, res) => {
    const filename = req.params.filename;

    let filePath = path.resolve(
      __dirname + "/../files/" + req.user.account._id
    );

    console.log("path", filePath);

    if (!fs.existsSync(filePath)) {
      res.send({
        error: "File not found",
        filename,
      });
    }

    let upload_path = filePath + "/" + filename;

    if (!fs.existsSync(upload_path)) {
      res.send({
        error: "File not found",
        filename,
      });
    }

    res.sendFile(upload_path);
  });

  router.post("/upload", async (req, res) => {
    if (!req.files.file) {
      return res.send({
        error: "Error uploading image",
      });
    }

    let path = __dirname + "/../files/" + req.user.account._id;
    let fileName = Date.now() + "__" + req.files.file.name;
    let newFile = new File({
      user: req.user._id,
      account: req.user.account._id,
      name: fileName,
      type: req.files.file.mimetype,
      ext: fileName.split(".").pop(),
    });

    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }

    let upload_path = path + "/" + fileName;

    req.files.file.mv(upload_path, () => {
      newFile
        .save()
        .then(function (doc) {
          res.send({
            path: config.BASE_URL + "/library/" + "/" + doc.name,
            file: doc,
          });
        })
        .catch(function (e) {
          res.send(e);
        });
    });
  });

  return router;
};
