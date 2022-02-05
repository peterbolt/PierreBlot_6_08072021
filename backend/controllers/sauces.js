const Sauce = require("../models/Sauce");
const fs = require("fs"); // permet de supprimer une image
const Joi = require("joi"); // contrôle les données entrées dans le formulaire

exports.createSauce = (req, res, next) => {
  const schema = Joi.object().keys({
    userId: Joi.string().required(),
    name: Joi.string().min(3).max(15).required(),
    manufacturer: Joi.string().min(3).max(20).required(),
    description: Joi.string().min(5).max(50).required(),
    mainPepper: Joi.string().min(3).max(15).required(),
    heat: Joi.number().required(),
  });
  if (schema.validate(JSON.parse(req.body.sauce)).error) {
    res.send(schema.validate(JSON.parse(req.body.sauce)).error.details);
  }
  // sauvegarde des données entrées dans une constante
  const sauceObject = JSON.parse(req.body.sauce);
  const sauce = new Sauce({
    // ajout des infos de la constante dans le Schéma de la nouvelle Sauce
    ...sauceObject,
    // création d'un URL et renommage de l'image
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
    likes: 0,
    dislikes: 0,
    usersDisliked: [],
    usersLiked: [],
  });
  // sauvegarde dans la BDD de la nouvelle sauce
  sauce
    .save()
    .then(() => {
      res.status(201).json({
        message: "Sauce ajoutée !",
      });
    })
    .catch((error) => {
      res.status(400).json({
        error: "La Sauce n'a pas pu être ajouté !",
      });
    });
};

exports.getOneSauce = (req, res, next) => {
  // cherche une sauce à afficher en regardant l'id sélectionné
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
      // vérifie si le user qui veut modifier est bien celui qui a créé la sauce
      if (sauce.userId !== req.auth.userId) {
        res.status(401).json({ message: "Vous n'avez pas les droits !" });
      }
      // sauvegarde l'URL de l'image actuelle
      const saveImageUrl = sauce.imageUrl;
      // récupère le nom de l'image??
      const filename = sauce.imageUrl.split("/images/")[1];
      // si l'image est modifiée par le User : new req.file
      if (req.file) {
        // supprime l'ancienne image du répertoire
        fs.unlink(`images/${filename}`, () => {});
        // sauvegarde la nouvelle image dans une constante
        const sauceObject = req.file
          ? {
              // met à jour les nouvelles data de la sauce
              ...JSON.parse(req.body.sauce),
              imageUrl: `${req.protocol}://${req.get("host")}/images/${
                req.file.filename
              }`,
            }
          : // sinon retourne les mêmes data
            { ...req.body };
        // sauvegarde la màj dans la BDD
        Sauce.updateOne(
          { _id: req.params.id },
          { ...sauceObject, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Sauce modifiée !" }))
          .catch((error) =>
            res
              .status(400)
              .json({ error: "La Sauce n'a pas pu être modifié !" })
          );
      } else {
        // sinon si l'image est pas modifiée, récupére les nouvelles data et les stocke dans une constante
        const newItem = req.body;
        // puis remet l'URL de l'image qui était sauvegardé
        newItem.imageUrl = saveImageUrl;
        // sauvegarde la màj dans la BDD
        Sauce.updateOne(
          { _id: req.params.id },
          { ...newItem, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Sauce modifié !" }))
          .catch((error) =>
            res
              .status(400)
              .json({ error: "La Sauce n'a pas pu être modifié !" })
          );
      }
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      // vérifie si le user qui veut supprimer est bien celui qui a créé la sauce
      if (sauce.userId !== req.auth.userId) {
        res.status(401).json({ message: "Vous n'avez pas les droits !" });
      }
      const filename = sauce.imageUrl.split("/images/")[1];
      // supprime l'image si:
      fs.unlink(`images/${filename}`, () => {
        // la sauce n'existe pas
        if (!sauce) {
          res.status(404).json({
            error: new Error("La Sauce n'existe pas"),
          });
        }
        // vérifie si le user qui veut supprimer est bien celui qui a créé la sauce
        if (sauce.userId !== req.auth.userId) {
          res.status(401).json({
            error: new Error("Vous n'avez pas les droits !"),
          });
        }
        // supprime la sauce dans la BDD
        Sauce.deleteOne({ _id: req.params.id })
          .then(() => {
            res.status(200).json({
              message: "Sauce supprimée !",
            });
          })
          .catch((error) => {
            res.status(400).json({
              error: "La Sauce n'a pas pu être supprimé !",
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

// configuration des likes
exports.likeSauce = (req, res, next) => {
  // cherche la bonne sauce à modifier
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      // ajout du statut like/dislike dans une constante
      const like = req.body.like;
      // si le user a déjà liké:
      if (sauce.usersLiked.includes(req.body.userId)) {
        // supprime son like
        sauce.likes--;
        // supprime son id de la base
        const index = sauce.usersLiked.indexOf(req.body.userId);
        sauce.usersLiked.splice(index, 1);
        //sinon si le user vient  de liker:
      } else if (like === 1) {
        // rajoute un like dans la base
        sauce.likes++;
        // rajoute l'id du user dans la base
        sauce.usersLiked.push(req.body.userId);
      }
      // si le user a déjà disliké:
      if (sauce.usersDisliked.includes(req.body.userId)) {
        // supprime son dislike
        sauce.dislikes--;
        // supprime son id de la base
        const index = sauce.usersDisliked.indexOf(req.body.userId);
        sauce.usersDisliked.splice(index, 1);
        //sinon si le user vient de disliker:
      } else if (like === -1) {
        // rajoute un dislike dans la base
        sauce.dislikes++;
        // rajoute l'id du user dans la base
        sauce.usersDisliked.push(req.body.userId);
      }
      sauce
        .save()
        .then(() => res.status(200).json({ message: "Sauce liké/disliké !" }))
        .catch((error) =>
          res
            .status(400)
            .json({ error: "Impossible de liké/disliké la Sauce !" })
        );
    })
    .catch((error) => res.status(400).json({ error }));
};
