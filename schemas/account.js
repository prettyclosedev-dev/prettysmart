const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoose_delete = require("mongoose-delete");

let accountSchema = new Schema(
  {
    name: String,
    huddle_account_id: String,
    huddle_user_id: String,
    huddle_account_user_id: String,
    huddle_email: String,
    unarchive_huddle_user: Boolean,
    brands: [],
    brand_email: String,
    brand_phone: String,
    brand_primary: String,
    brand_secondary: String,
    brand_footer: String,
    status: String,
    special_access: {
      type: Boolean,
      // default: false,
      get: function () {
        return this.generators.length || this.pages.length;
      },
    },
    generators: [
      {
        id: String,
        name: String,
      },
    ],
    pages: [
      {
        name: String,
      },
    ],
    plan_id: String,
    payment_failed: {
      type: Boolean,
      default: false,
    },
    plan_canceled: {
      type: Boolean,
      default: false,
    },
    stripe_session_id: String,
    stripe_customer_id: String,
    isDraft: {
      type: Boolean,
      default: true,
    },
    isWaiting: Boolean,
    isBoarded: Boolean,
    industry_description: String,
    what_we_are: {
      type: String,
      default: "",
    },
    tagline: {
      type: String,
      default: "",
    },
    industry: {
      type: String,
      default: "",
    },
    generating_ai: {
      type: Boolean,
      default: false,
    },
    AI: {},
    place_id: String,
    brand: {
      logos: {
        logo: String,
        icon: String,
        watermark: String,
      },
      colors: {
        primary: {
          type: String,
          default: "#1A428A",
        },
        primaryLocked: {
          type: Boolean,
          default: false,
        },
        secondary: {
          type: String,
          default: "#D5BA8C",
        },
        secondaryLocked: {
          type: Boolean,
          default: false,
        },
      },
      fonts: {
        Regular: {
          name: String,
          value: String,
          path: String,
          google: Boolean,
          url: String,
        },
        Italic: {
          name: String,
          value: String,
          path: String,
          google: Boolean,
          url: String,
        },
        Bold: {
          name: String,
          value: String,
          path: String,
          google: Boolean,
          url: String,
        },
        BoldItalic: {
          name: String,
          value: String,
          path: String,
          google: Boolean,
          url: String,
        },
      },
    },
    created_at: Number,
    updated_at: Number,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toObject: {
      getters: true,
    },
    toJSON: {
      getters: true,
    },
  }
);

accountSchema.virtual("users", {
  ref: "User",
  localField: "_id",
  foreignField: "account",
  justOne: false,
});

accountSchema.plugin(mongoose_delete, { overrideMethods: "all" });

// create the model for users and expose it to our app
module.exports = mongoose.model("Account", accountSchema);

// sample
// {
// 	"brand": {
// 		"logos": {
// 			"logo": "logo.svg",
// 			"watermark": "watermark.svg",
// 			"icon": "icon.svg"
// 		},
// 		"colors": {
// 			"primary": "#1A428A",
// 			"secondary": "#D5BA8C"
// 		},
// 		"fonts": {
// 			"Regular": {
// 				"name": "Poppins",
// 				"value": "Poppins-Regular",
// 				"path": "poppins/Poppins-Regular.ttf",
// 				"google": true
// 			},
// 			"Italic": {
// 				"name": "Poppins",
// 				"value": "Poppins-Italic",
// 				"path": "poppins/Poppins-Italic.ttf",
// 				"google": true
// 			},
// 			"Bold": {
// 				"name": "Poppins",
// 				"value": "Poppins-Bold",
// 				"path": "poppins/Poppins-Bold.ttf",
// 				"google": true
// 			},
// 			"BoldItalic": {
// 				"name": "Poppins",
// 				"value": "Poppins-BoldItalic",
// 				"path": "poppins/Poppins-BoldItalic.ttf",
// 				"google": true
// 			}
// 		}
// 	},
// 	"_id": "61d601fb2ef5432079fdd54a",
// 	"name": "AppGoalz",
// 	"huddle_account_id": "331",
// 	"huddle_user_id": "319",
// 	"huddle_account_user_id": "1",
// 	"huddle_email": "dev@weblew.com",
// 	"brands": [{
// 		"brand_id": 343
// 	}],
// 	"isDraft": true,
// 	"industry_description": "Software Development",
// 	"what_we_are": "software development company",
// 	"tagline": "software is our passion.",
// 	"industry": "software",
// 	"generating_ai": false,
// 	"deleted": false,
// 	"created_at": 1641415163830,
// 	"updated_at": 1641493974569,
// 	"__v": 0,
// 	"AI": {
// 		"employee_1": "software developer",
// 		"employee_1_plural": "software developers",
// 		"employee_2": "software engineer",
// 		"employee_2_plural": "software engineers",
// 		"employee_3": "software designer",
// 		"employee_3_plural": "software designers",
// 		"verb_1": "developing software",
// 		"verb_2": "designing software",
// 		"verb_3": "coding software",
// 		"need_1": "business",
// 		"need_1_plural": "businesses",
// 		"need_2": "company",
// 		"need_2_plural": "companies",
// 		"need_3": "software needs",
// 		"need_3_plural": "software needs",
// 		"solution_1": "a software project",
// 		"solution_1_plural": "software projects",
// 		"solution_2": "a software design",
// 		"solution_2_plural": "software designs",
// 		"solution_3": "a software development",
// 		"solution_3_plural": "software developments",
// 		"adjective_1": "innovative",
// 		"adjective_1_superlative": "most innovative",
// 		"adjective_2": "cutting-edge",
// 		"adjective_2_superlative": "most cutting-edge",
// 		"adjective_3": "modern",
// 		"adjective_3_superlative": "most modern",
// 		"deliverable_1": "software",
// 		"deliverable_1_plural": "softwares",
// 		"deliverable_2": "app",
// 		"deliverable_2_plural": "apps",
// 		"deliverable_3": "program",
// 		"deliverable_3_plural": "programs",
// 		"benefit_1": "get a new app",
// 		"benefit_2": "be on the cutting edge",
// 		"benefit_3": "have a modern app"
// 	},
// 	"plan_id": "price_1IheVxEKYFv2O5jVQMLysd8i",
// 	"stripe_customer_id": "cus_KuXIUQ16yEUzFh",
// 	"stripe_session_id": "cs_live_b1D4p0fMzVbEqxRM1ecObeYOD73m7SY8P3xBsg4e7xSU7QJuri4MOwG8AA",
// 	"id": "61d601fb2ef5432079fdd54a"
// }
