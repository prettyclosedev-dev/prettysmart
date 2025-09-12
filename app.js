const express = require("express");
const path = require("path");
const app = express();
const config = require("./config.json");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const db = require("./db");
const fileUpload = require("express-fileupload");
const {
  amountOfCredits,
  getHardcodedCurrentPlan,
  calculateCreditsLeft,
} = require("./site_routes/utils");
global._ = require("lodash");
global.db = db;
global.isDev = config.isDev;

require("./firebase")

mongoose.connect(config.database, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(
  express.urlencoded({
    extended: true,
    verify: function (req, res, buf, encoding) {
      req.rawBody = buf;
    },
  })
);
app.use(
  express.json({
    limit: "200mb",
    verify: function (req, res, buf, encoding) {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());
app.use(
  session({
    secret: "PrettyDumb",
    resave: true,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: config.database,
    }),
    // cookie : {
    //     sameSite : config.cookie.sameSite,
    //     secure : config.cookie.secure
    // }
  })
);
app.set("trust proxy", true);
require("./passport")(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(fileUpload({}));

app.use((req, res, next) => {
  let url = req.url.replace("/", "");
  let open_routes = [
    "",

    /** STATIC FILES - DO NOT DEPLOY TO SERVER **/
    "static",
    "site_static",
    "files",
    /** STATIC FILES - DO NOT DEPLOY TO SERVER **/
    
    "login",
    "forgot",
    "reset",
    "signup",
    "webhooks",
    "logout",
    "pages",
    "landing",
    "landing?affiliate=true",
    "landing?ref=producthunt",
    "?ref=producthunt",
    "clyps",
  ];

  res.locals.light = false;
  res.locals.fixed_header = false;
  res.locals.show_export = false;
  res.locals.url = url;

  const isOpen = () => {
    return (
      open_routes.includes(url) ||
      url.startsWith("public") ||

      /** STATIC FILES - DO NOT DEPLOY TO SERVER **/
      url.startsWith("static") ||
      url.startsWith("files") ||
      url.startsWith("site_static") ||
      /** STATIC FILES - DO NOT DEPLOY TO SERVER **/

      url.startsWith("pages") ||
      url.startsWith("reset") ||
      url.startsWith("webhooks")
    );
  };

  if (req.isAuthenticated()) {
    const needsToLogin = () => {
      // let secondsSinceLastLogin = (Date.now() - req.user.login_date) / 1000;

      return !req.user.account;
    };

    if (needsToLogin() && !isOpen()) {
      return res.redirect("/login");
    }

    if (isOpen()) {
      if (url === "") {
        return res.redirect("/templates");
      }

      return next();
    }

    res.locals.user = req.user;
    res.locals.isMultiAccount = req.user.isMultiAccount;

    const plan_name = getHardcodedCurrentPlan(req.user.account.plan_id);
    res.locals.plan_name = plan_name;
    calculateCreditsLeft(req, res, function (credits) {
      res.locals.credits_left = credits;
    });

    res.locals.payment_failed = req.user.account.payment_failed;
    if (req.user.account.payment_failed) {
      res.locals.infobox = {
        text: "There was an issue with your payment please resolve.",
        button: {
          text: "Resolve here",
          link: "/plans",
        },
      };
    }

    res.locals.plan_canceled = req.user.account.plan_canceled;
    if (req.user.account.plan_canceled) {
      res.locals.infobox = {
        text: "There was an issue with your plan please resolve.",
        button: {
          text: "Resolve here",
          link: "/plans",
        },
      };
    }

    // const needsPlan = () => {
    //   return (
    //     !req.user.account.plan_id &&
    //     !url.startsWith("plans") &&
    //     !url.startsWith("brand") &&
    //     !url.startsWith("onboarding") &&
    //     !url.startsWith("customization")
    //   );
    // };

    // if (needsPlan()) {
    //   return res.redirect("/plans");
    // }

    res.locals.affiliate = req.session.affiliate;

    const needsPayment = () => {
      return !req.user.account.plan_id;
    };

    if (
      needsPayment() &&
      !url.startsWith("subscribe") &&
      !url.startsWith("payment")
    ) {
      return res.redirect("/subscribe");
    }

    // Used to know if to open help section in setup by default
    res.locals.upgrading = req.session.upgrading;

    // Used to determine if to show help popup - need to show only once
    const updateTimesSentToSetup = () => {
      const times_sent_to_setup = req.session.times_sent_to_setup || 0;
      req.session.times_sent_to_setup = times_sent_to_setup + 1;
      res.locals.times_sent_to_setup = req.session.times_sent_to_setup;
    };

    let brand = req.user.account.brand;
    let user = req.user;

    if (
      !url.startsWith("settings") &&
      !url.startsWith("subscribe") &&
      !url.startsWith("payment") &&
      !url.startsWith("brand/brand-assets-payment") &&
      !url.startsWith("brand/logo") &&
      (!brand || !brand.logos || !brand.logos.logo) &&
      (!user.phone && !user.account.name && !user.account.brand_phone) &&
      (!url.startsWith("brand") ||
        (req.user.master && !url.startsWith("setup")))
    ) {
      updateTimesSentToSetup();
      return req.user.master ? next() : res.redirect("/brand");
    }

    if (
      url.startsWith("brand") ||
      (req.user.master && url.startsWith("setup"))
    ) {
      updateTimesSentToSetup();
    }

    return next();
  } else {
    if (isOpen()) {
      return next();
    }

    return res.redirect("/login");
  }
});

// view engine setup
app.set("views", path.join(__dirname, "site_views"));
app.set("view engine", "ejs");

app.use(function (req, res, next) {
  res.locals.BUSTER = Date.now();
  next();
});

app.use(function (error, req, res, next) {
  if (error.errors) {
    res.status(400).send({
      message: error._message || error.message,
      errors: error.errors,
      kind: error.kind,
    });
  } else if (error.errmsg) {
    res.status(400).send({
      message: error.errmsg,
      kind: error.kind,
    });
  } else if (error.kind === "ObjectId") {
    res.status(400).send({
      message: error.value + " is an invalid _id",
      kind: error.kind,
    });
  } else {
    res.status(400).send({
      error: error.stack ? error.stack.split("\n") : error.toString(),
      kind: error.kind,
    });
  }
});

// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

app.use("/", require("./site_routes/index")());
app.use("/landing", require("./site_routes/index")());
app.use("/app", require("./site_routes/app")());
app.use("/login", require("./site_routes/login")());
app.use("/clyps", require("./site_routes/clyps")());
app.use("/forgot", require("./site_routes/forgot")());
app.use("/reset", require("./site_routes/reset")());
app.use("/logout", require("./site_routes/logout")());
app.use("/signup", require("./site_routes/signup")());
app.use("/setup", require("./site_routes/setup")());
app.use("/plans", require("./site_routes/plans")());
app.use("/subscribe", require("./site_routes/subscribe")());
app.use("/payment", require("./site_routes/payment")());
app.use("/brand", require("./site_routes/brand")());
app.use("/old-brand", require("./site_routes/old-brand")());
app.use("/start", require("./site_routes/start")());
app.use("/events", require("./site_routes/events")());
app.use("/sizes", require("./site_routes/sizes")());
app.use("/form", require("./site_routes/form")());
app.use("/new-form", require("./site_routes/new-form")());
app.use("/templates", require("./site_routes/templates")());
app.use("/q&a", require("./site_routes/q&a")());
app.use("/recents", require("./site_routes/recents")());
app.use("/zmanim", require("./site_routes/zmanim")());
app.use("/projects", require("./site_routes/projects")());
app.use("/editor", require("./site_routes/editor")());
app.use("/customization", require("./site_routes/customization")());
app.use("/unsplash", require("./site_routes/unsplash")());
app.use("/library", require("./site_routes/library")());
app.use("/account", require("./site_routes/account")());
app.use("/webhooks", require("./site_routes/webhooks")());
app.use("/generator", require("./site_routes/generator")());
app.use("/newsroom", require("./site_routes/newsroom")());
app.use("/chanukah", require("./site_routes/chanukah")());
app.use("/quotes", require("./site_routes/quotes")());
app.use("/reviews", require("./site_routes/reviews")());
app.use("/collateral", require("./site_routes/collateral")());
app.use("/dashboard", require("./site_routes/dashboard")());
app.use("/favorites", require("./site_routes/favorites")());
app.use("/old-templates", require("./site_routes/old-templates")());
app.use("/onboarding", require("./site_routes/onboarding")());
app.use("/settings", require("./site_routes/settings")());
app.use("/support", require("./site_routes/support")());
app.use("/pages/:page", require("./site_routes/page")());
app.use("/clip-studio", require("./site_routes/clip-studio")());
app.use("/real-estate", require("./site_routes/real-estate")());
app.use("/mortgage-news", require("./site_routes/mortgage-news")());
app.use("/mortgage-rates", require("./site_routes/mortgage-rates")());

/** STATIC FILES - DO NOT DEPLOY TO SERVER **/
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/site_static", express.static(path.join(__dirname, "site_static")));
app.use("/files", express.static(path.join(__dirname, "files")));
/** STATIC FILES - DO NOT DEPLOY TO SERVER **/

app.use(function (req, res) {
  res.render("404", {
    page: "404",
  });
});

app.settings.env = config.isDev ? "development" : "production";

mongoose.connection.on("error", (error) => {
  console.log(error);
});

mongoose.connection.once("open", () => {
  console.log("DB Connected!!!");
});

app.listen(config.SITE_PORT, function () {
  console.log("Application is running on: http://localhost:" + config.SITE_PORT);
  console.log("Environment: " + app.settings.env);
});

exports.app = frontEndApp;

function frontEndApp() {
  return app;
}
