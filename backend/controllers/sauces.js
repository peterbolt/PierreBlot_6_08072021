const Sauce = require("../models/Sauce");
const fs = require("fs");
const Joi = require("joi");

exports.createSauce = (req, res, next) => {
  const schema = Joi.object().keys({
    name: Joi.string().min(3).max(15).required(),
    manufacturer: Joi.string().min(3).max(20).required(),
    description: Joi.string().min(5).max(50).required(),
    mainPepper: Joi.string().min(3).max(15).required(),
  });
  if (schema.validate(req.body).error) {
    res.send(schema.validate(req.body).error.details);
  }
  const sauceObject = JSON.parse(req.body.sauce);
  const sauce = new Sauce({
    ...sauceObject,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
    likes: 0,
    dislikes: 0,
    usersDisliked: [],
    usersLiked: [],
  });
  sauce
    .save()
    .then(() => {
      res.status(201).json({
        message: "Post saved successfully!",
      });
    })
    .catch((error) => {
      res.status(400).json({
        error: error,
      });
    });
};

exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({
    _id: req.params.id,
  })
    .then((sauce) => {
      res.status(200).json(sauce);
    })
    .catch((error) => {
      res.status(404).json({
        error: error,
      });
    });
};

exports.modifySauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId !== req.auth.userId) {
        res.status(401).json({ message: "Unauthorized!" });
      }
      const saveImageUrl = sauce.imageUrl;
      const filename = sauce.imageUrl.split("/images/")[1];
      if (req.file) {
        fs.unlink(`images/${filename}`, () => {});
        const sauceObject = req.file
          ? {
              ...JSON.parse(req.body.sauce),
              imageUrl: `${req.protocol}://${req.get("host")}/images/${
                req.file.filename
              }`,
            }
          : { ...req.body };
        Sauce.updateOne(
          { _id: req.params.id },
          { ...sauceObject, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Objet modifié !" }))
          .catch((error) => res.status(400).json({ error }));
      } else {
        const newItem = req.body;
        newItem.imageUrl = saveImageUrl;
        Sauce.updateOne(
          { _id: req.params.id },
          { ...newItem, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Objet modifié !" }))
          .catch((error) => res.status(400).json({ error }));
      }
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId !== req.auth.userId) {
        res.status(401).json({ message: "Unauthorized!" });
      }
      const filename = sauce.imageUrl.split("/images/")[1];
      fs.unlink(`images/${filename}`, () => {
        if (!sauce) {
          res.status(404).json({
            error: new Error("No such Thing!"),
          });
        }
        if (sauce.userId !== req.auth.userId) {
          res.status(401).json({
            error: new Error("Unauthorized request!"),
          });
        }
        Sauce.deleteOne({ _id: req.params.id })
          .then(() => {
            res.status(200).json({
              message: "Deleted!",
            });
          })
          .catch((error) => {
            res.status(400).json({
              error: error,
            });
          });
      });
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.getAllSauces = (req, res, next) => {
  Sauce.find()
    .then((sauces) => {
      res.status(200).json(sauces);
    })
    .catch((error) => {
      res.status(400).json({
        error: error,
      });
    });
};

exports.likeSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      const like = req.body.like;
      if (sauce.usersLiked.includes(req.body.userId)) {
        sauce.likes--;
        const index = sauce.usersLiked.indexOf(req.body.userId);
        sauce.usersLiked.splice(index, 1);
      } else if (like === 1) {
        sauce.likes++;
        sauce.usersLiked.push(req.body.userId);
      }
      if (sauce.usersDisliked.includes(req.body.userId)) {
        sauce.dislikes--;
        const index = sauce.usersDisliked.indexOf(req.body.userId);
        sauce.usersDisliked.splice(index, 1);
      } else if (like === -1) {
        sauce.dislikes++;
        sauce.usersDisliked.push(req.body.userId);
      }
      sauce
        .save()
        .then(() => res.status(200).json({ message: "OK" }))
        .catch((error) => res.status(400).json({ error }));
    })
    .catch((error) => res.status(400).json({ error }));
};
