var object_hash;

DSHDEditorLib.configure({
  access_token: TOKEN,
  domain: "prettysmart.designhuddle.com",
});

var locations = [
  "templates",
  "zmanim",
  "newsroom",
  "collateral",
  "q&a",
  "mortgage-news",
  "mortgage-rates",
  "reviews",
  "quotes",
  "chanukah",
  "clip-studio",
];

if (
  !window.location.pathname.includes("generator") &&
  !window.location.pathname.includes("recents") &&
  !window.location.pathname.includes("favorites") &&
  !window.location.pathname.includes("editor") &&
  !window.location.pathname.includes("clip-studio")
) {
  if (window.location.pathname.includes("brand")) {
    getCustomization({ runAI: true, row_class_name: "test" });
  } else if (window.location.pathname.includes("newsroom")) {
    getCustomization({ runAI: true, row_class_name: "Newsroom" });
  } else if (window.location.pathname.includes("reviews")) {
    getCustomization({ runAI: true, row_class_name: "Reviews" });
  } else if (window.location.pathname.includes("q&a")) {
    getCustomization({ runAI: true, row_class_name: "qa" });
  } else if (window.location.pathname.includes("chanukah")) {
    getCustomization({ runAI: true, row_class_name: "Chanukah" });
  } else if (window.location.pathname.includes("clip-studio")) {
    getCustomization({ runAI: true, row_class_name: "Clyps" });
  } else if (
    !window.location.search ||
    !window.location.search.indexOf("engine") ||
    window.location.search.indexOf("input=marketing") > -1 ||
    window.location.search.indexOf("input=facts") > -1
  ) {
    getCustomization({});
  }
  // else if (!window.location.search.indexOf("input")) { // don't run on first load
  // getCustomization({runAI: window.location.search.indexOf("engine") > -1, row_class_name: typeof ai_engine == "string" && ai_engine.length > 0 ? ai_engine : null});
  // }
}

$(document)
  .on("click", '[data-toggle="modal"]', function () {
    var target = $(this).data("target");

    $("body").addClass("modal-open");
    $(".modal-backdrop").addClass("show d-block");
    $(target).addClass("show d-block");

    return false;
  })
  .on("click", ".new-popup-wrapper .close", function () {
    // if (window.location.pathname.includes("clip-studio")) {
    //   return true;
    // }

    closeExportModal();

    return false;
  })
  .on("click", "[data-export]", function () {
    var $template = $(this),
      exportFileName = $template.attr("title"),
      img = $template.find("img").not(".loader").attr("src"),
      project_id = $template.data("project"),
      template_id = $template.data("template"),
      hash = $template.data("hash"),
      original_title = $template.attr("original_title");

    if (
      locations.includes(window.location.pathname) &&
      $template.find(".template-loader").css("display") !== "none"
    ) {
      return;
    }

    if (
      locations.includes(window.location.pathname) &&
      !isAllowedDownload(original_title)
    ) {
      return;
    }

    openTemplateModal({
      fileName: exportFileName,
      img,
      project_id,
      template_id,
      hash,
      original_title,
    });

    hideLoader($(".template-sec"));
    return false;
  })
  .on("click", ".export-dropdown-item", function () {
    var $form = $('[name="export_form"]');
    $form.data("file_type", $(this).val());
    submitted(formParams($form));
    return false;
  })
  .on("change", '[name="file_type"]', function () {
    var type = $(this).val();

    if (type === "pdf" || type === "pdf_flattened") {
      $(".export-crop-marks").removeClass("d-none");
    } else {
      $(".export-crop-marks").addClass("d-none");
    }
  })
  .on("submit", '[name="export_form"]', function (e) {
    e.preventDefault();
    var $form = $(this);
    $form.data("file_type", "jpg");
    submitted(formParams($form));
    return false;
  })
  .on("click", ".download-button-item", function () {
    var $template = $(this).closest(".template").find("[data-export]"),
      file_name = $template.attr("title"),
      img = $template.find("img").not(".loader").attr("src"),
      project_id = $template.data("project"),
      template_id = $template.data("template"),
      object_hash = $template.data("hash"),
      original_title = $template.attr("original_title"),
      file_type = $(this).val();

    if (
      locations.includes(window.location.pathname) &&
      !isAllowedDownload(original_title)
    ) {
      fbq("track", "AddToWishlist", {
        template: file_name,
      });
      return;
    }

    directDownload({
      project_id,
      object_hash,
      template_id,
      file_name,
      file_type,
      templateDiv: $(this).closest(".template"),
    });
    return false;
  })
  .on("click", "[data-editor]", function () {
    var $form = $(this).closest("form"),
      project_id = $form.data("project"),
      object_hash = $form.data("hash"),
      template_id = $form.data("template");

    $(".export-proggress").removeClass("d-none");

    if (project_id) {
      openEditor(project_id, template_id, object_hash);
    } else {
      DSHDEditorLib.createProject(
        {
          template_id: template_id,
          customizations_hash: object_hash,
        },
        function (error, project) {
          if (!error) {
            saveProject(project.project_id, false, template_id, object_hash);
            $form.data("project", project.project_id);
            $('[data-template="' + template_id + '"]').data(
              "project",
              project.project_id
            );
            openEditor(project.project_id, template_id, object_hash);
          }
        }
      );
    }

    return false;
  })
  .on("click", ".export-progress-cancel", function () {
    closeExportModal();
  })
  .on("click", ".refresh-link", function () {
    $(this).closest(".item-wrapper").find("[data-ready-size].active").click();

    return false;
  })
  .on("change", ".segment-item", function (e) {
    // switch (window.location.pathname) {
    //   case "/templates":
    //   case "/quotes":
    //   case "/chanukah":
    //   case "/clip-studio":
    //   case "/collateral":
    var $this = $(this),
      sizeID = $this.attr("id").split("-")[2],
      rowID = $(this).closest(".item-wrapper").attr("id");

    showLoader($(this).closest(".item-wrapper"));

    $(this)
      .closest(".item-wrapper")
      .find(".swiper")
      .load(
        encodeURI(
          window.location.pathname + "/resize?row=" + rowID + "&size=" + sizeID
        ) + " .single-swiper-wrapper",
        function (res) {
          window.refreshRow = $this;
          getCustomization({}, function () {
            resetSwiper($this);
          });
        }
      );
    //     break;
    // }
  })
  .on("click", "[data-ready-size]", function (e) {
    e.preventDefault();

    var $this = $(this),
      size = $this.data("size"),
      row = $this.data("row"),
      tag = $this.data("tag"),
      page = $this.data("page"),
      see_all = $this.closest(".item-wrapper").find(".arrow-link"),
      category = $this.data("category"),
      see_all_link = "/templates/" + category + "?row=" + row;

    if (size) {
      see_all_link += "&size=" + size;
    }

    if (tag) {
      see_all_link += "&search=" + tag;
    }

    if (page) {
      see_all_link += "&page=" + page;
    }

    see_all.attr("href", encodeURI(see_all_link));

    $this.addClass("active").siblings().removeClass("active");

    showLoader($(this).closest(".item-wrapper, .templates-page"));

    $(this)
      .closest(".item-wrapper, .templates-page")
      .find(".templates-row-container")
      .load(encodeURI($this.attr("href")) + " .templates-row", function () {
        window.refreshRow = $this;
        getCustomization({});
      });

    return false;
  });

async function getCustomization(options, cb, icb) {
  var ai_fields = {},
    queryFields = [],
    news_fields = {};

  var promises = [];

  var failed = false;

  $(".ai_field").each(function () {
    var dfd = $.Deferred();

    var $this = $(this);

    if ($this.val()) {
      if (
        options &&
        (options.row_class_name === "Link" ||
          (options.row_class_name === "Newsroom" &&
            $this.val().includes("http")))
      ) {
        $.post("/generator/parse?url=" + $this.val())
          .then(function (data) {
            if (data.success && data.body) {
              var html = document.createElement("html");
              html.innerHTML = data.body;

              var body = $(html).find("body:first");
              var finalText = body
                .text()
                .substr(0, 1800)
                .replace(/[^\w ]/, "")
                .replace(/  |\r\n|\n|\r/gm, ""); // cut chars and next lines etc
              if (options.row_class_name === "Link") {
                ai_fields[$this.attr("name")] = finalText;
              } else {
                ai_fields.news = finalText;
              }

              news_fields = {
                title: data.title,
                body: finalText,
                media: data.image,
                source: data.domain,
                isUrl: $this.val().includes("http"),
              };
            } else {
              var $template = $(".template");
              hideLoader($template);
              closeExportModal();
              toggleStep("generate");
              alert(
                Object.keys(data.error).length > 0
                  ? "There was a problem parsing the url!\n" +
                      JSON.stringify(data.error)
                  : "There was a problem parsing the url!"
              );
              failed = true;
              return;
            }
            dfd.resolve();
          })
          .catch(function (e) {
            var $template = $(".template");
            hideLoader($template);
            closeExportModal();
            toggleStep("generate");
            alert(
              Object.keys(e).length > 0
                ? "There was a problem parsing the url!\n" + JSON.stringify(e)
                : "There was a problem parsing the url!"
            );
            failed = true;
            return;
          });
      } else {
        ai_fields[$this.attr("name")] = $this.val();
        dfd.resolve();
      }
    } else {
      dfd.resolve();
    }

    promises.push(dfd);
  });

  $.when.apply($, promises).done(function () {
    if (failed) {
      return;
    }

    if (options && options.ignoreCache) {
      queryFields.push("ignoreCache=" + options.ignoreCache);
    }

    if (options && options.row_class_name) {
      queryFields.push("row_class_name=" + options.row_class_name);
    } else if (location.pathname.indexOf("mortgage-news") > -1) {
      queryFields.push("row_class_name=mu");
      if (typeof articles !== "undefined" && articles && articles.length) {
        articles.forEach(function (article, index) {
          ai_fields["mu_" + (index + 1)] = article.body;
          ai_fields["mu_title_" + (index + 1)] = article.title;
        });
      }
    } else if (location.pathname.indexOf("mortgage-rates") > -1) {
      if (typeof rates !== "undefined" && rates && rates.length) {
        const data = rates[0].large_chart_data;
        if (data && data.length) {
          $("body").append(
            `<div id="chart-container" style="display: none; width: 600px; height: 400px; margin: 0 auto"></div>`
          );

          try {
            const chart = Highcharts.chart("chart-container", {
              chart: {
                zoomType: "x",
              },
              title: {
                text: user.account.name,
              },
              // subtitle: {
              //     text: '${user.email || user.account.brand_email}'
              // },
              xAxis: {
                type: "datetime",
              },
              yAxis: {
                opposite: true,
                title: {
                  text: "30 Year Fixed",
                },
              },
              legend: {
                enabled: false,
              },
              plotOptions: {
                series: {
                  marker: {
                    enabled: false,
                  },
                },
                area: {
                  fillColor: {
                    linearGradient: {
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 1,
                    },
                    stops: [
                      [0, user.account.brand.colors.primary + "cc"],
                      [1, user.account.brand.colors.secondary + "cc"],
                    ],
                  },
                  marker: {
                    radius: 2,
                  },
                  lineWidth: 1,
                  states: {
                    hover: {
                      lineWidth: 1,
                    },
                  },
                  threshold: null,
                },
              },
              credits: {
                enabled: false,
              },
              series: [
                {
                  type: "area",
                  turboThreshold: data.length,
                  name: "30 Year Fixed",
                  color: user.account.brand.colors.primary,
                  data: data.map((obs) => {
                    return {
                      x: new Date(obs.date),
                      y: parseFloat(obs.value),
                    };
                  }),
                },
              ],
            });

            var svg = chart.getSVG();
            rates[0].large_chart = "data:image/svg+xml;utf8," + svg;
            $("#chart-container").remove();
          } catch (e) {
            console.log(e);
          }
        }
      }
    } else if (location.pathname.indexOf("chanukah") > -1) {
      queryFields.push("row_class_name=Chanukah");
    } else if (location.pathname.indexOf("clip-studio") > -1) {
      queryFields.push("row_class_name=Clyps");
    }

    var skipAI = options && !options.runAI;

    if (
      location.pathname.indexOf("onboarding") > -1 ||
      (location.pathname.indexOf("brand") > -1 && skipAI) ||
      (location.pathname == "/templates" && skipAI) ||
      location.pathname.indexOf("quotes") > -1 || // not needed skipping because of Quote row name
      location.pathname.indexOf("collateral") > -1 ||
      location.pathname.indexOf("zmanim") > -1 ||
      (location.pathname.indexOf("newsroom") > -1 && skipAI) ||
      (location.pathname.indexOf("reviews") > -1 && skipAI) ||
      (location.pathname.indexOf("q&a") > -1 && skipAI) ||
      location.pathname.indexOf("real-estate") > -1 ||
      location.pathname.indexOf("mortgage-rates") > -1 ||
      location.pathname.indexOf("45") > -1
    ) {
      queryFields.push("onboarding=1");
    }

    $.ajax({
      type: "POST",
      url: "/customization?" + queryFields.join("&"),
      data: JSON.stringify({
        ai_fields: ai_fields,
        news_fields: news_fields,
        articles:
          location.pathname.indexOf("mortgage-news") &&
          typeof articles !== "undefined"
            ? articles
            : undefined,
        rates:
          location.pathname.indexOf("mortgage-rates") &&
          typeof rates !== "undefined"
            ? rates
            : undefined,
        brand: options && options.brand,
      }),
      dataType: "json",
      contentType: "application/json",
      success: function (res) {
        if (res.ai_error) {
          $("body").append(`<div class="info-box df aic ffp fs13">
            <p class="mb-0">There is currently an issue with OpenAI. <a href="https://status.openai.com">Check the status here.</a></p>
            <button onclick="hideInfoBox()" class="df acc mla" style="color: white; border: none; background-color: transparent;"><i class="fa-regular fa-xmark"></i></button>
          </div>`);
        }

        DSHDEditorLib.storeTemplateCustomizationObject(
          {
            object: {
              classes: res.classes,
            },
          },
          function (err, data) {
            if (data && data.object_hash) {
              object_hash = data.object_hash;

              if (!window.location.pathname.includes("generator")) {
                initTemplates(
                  { reviews_amount: res.reviews_amount },
                  function (response) {
                    if (icb) {
                      icb(response);
                    }
                  }
                );
              } else {
                if (icb) {
                  icb(err);
                }
              }
            }

            if (cb) {
              cb(data, err);
            }

            if (err) {
              console.log(err);
            }
          }
        );
      },
      error: (err) => {
        console.log(err);
        if (cb) {
          cb(null, err);
        }

        if (icb) {
          icb(err);
        }
      },
    });
  });
}

function initTemplates(opts, cb) {
  if (!object_hash) {
    return;
  }
  var $templates = window.refreshRow
    ? window.refreshRow.closest(".item-wrapper").find("[data-template]")
    : $("[data-template]");

  if (window.location.pathname.includes("reviews")) {
    var review_rows_names = [];
    var review_rows = [];
    $templates
      .closest(".item-wrapper")
      .find(".item-header p")
      .each(function () {
        review_rows_names.push($(this).text());
        review_rows.push({ row: $(this).text(), amount_in_row: 0 });
      });
  }

  var didSucceed = false;

  $templates.each(function (index) {
    var $template = $(this),
      template_id = $template.data("template");

    if (window.location.pathname.includes("reviews")) {
      var review_row = $template
        .closest(".item-wrapper")
        .find(".item-header p")
        .text();
      var indexOf = review_rows_names.indexOf(review_row);
      if (indexOf > -1) {
        if (review_rows[indexOf].amount_in_row >= opts.reviews_amount) {
          $template.parent().parent().remove();
          return;
        } else {
          review_rows[indexOf].amount_in_row++;
        }
      }
    }

    DSHDEditorLib.getVariableTemplatePreviewURL(
      {
        template_id: template_id,
        customizations_hash: object_hash,
        width: $templates.length < 7 ? 1000 : 600,
      },
      function (error, image_url) {
        if (!error) {
          var preview_image = new Image();
          preview_image.src = image_url;
          preview_image.onload = function () {
            $template.data("hash", object_hash);
            $template.find("img").not(".loader").replaceWith(preview_image);
            $("img").bind("contextmenu", function (e) {
              return false;
            });
            hideLoader($template);
          };
          preview_image.onerror = function () {
            hideLoader($template);
            // alert("Failed to load template.");
            var segment = $template
              .closest(".item-wrapper")
              .find(".segment-item:checked, .segment-item[checked]");
            if (segment.length > 1) {
              segment = segment.eq(1);
            }
            const selectedSize = segment.val();
            $template
              .find("img")
              .not(".loader")
              .attr(
                "src",
                `/static/images/failed_${
                  selectedSize ? selectedSize.toLowerCase() : "horizontal"
                }@4x.jpg`
              );
          };

          didSucceed = true;
        } else {
          var segment = $template
            .closest(".item-wrapper")
            .find(".segment-item:checked, .segment-item[checked]");
          if (segment.length > 1) {
            segment = segment.eq(1);
          }
          const selectedSize = segment.val();
          $template
            .find("img")
            .not(".loader")
            .attr(
              "src",
              `/static/images/failed_${
                selectedSize ? selectedSize.toLowerCase() : "horizontal"
              }@4x.png`
            );

          didSucceed = false;
        }
      }
    );
  });

  if (cb) {
    cb({ success: didSucceed, reviews_amount: opts.reviews_amount });
  }
}

function showLoader(template) {
  $(template)
    .find(
      window.location.pathname.includes("generator") ||
        window.location.pathname.includes("brand")
        ? ".template-loader-new"
        : ".template-loader"
    )
    .show();

  if (
    window.location.pathname.includes("generator") ||
    window.location.pathname.includes("brand")
  ) {
    TextType.start(); // for text animation
  }
}

function hideLoader(template) {
  if (
    window.location.pathname.includes("generator") ||
    window.location.pathname.includes("brand")
  ) {
    TextType.stop(); // for text animation
  }

  $(template)
    .find(
      window.location.pathname.includes("generator") ||
        window.location.pathname.includes("brand")
        ? ".template-loader-new"
        : ".template-loader"
    )
    .fadeOut(300);
}

function toggleStep(step) {
  $("[data-step]").addClass("d-none");
  $(`[data-step="${step}"]`).removeClass("d-none");
}

function openTemplateModal(options) {
  var $form = $('[name="export_form"]');
  $form.data("hash", options.hash);
  $form.data("template", options.template_id);
  $form.data("project", options.project_id);
  $form.data("file_name", options.fileName);
  $form.data("original_title", options.original_title);
  $('[name="export_form"] .template')
    .find("img")
    .not(".loader")
    .replaceWith('<img src="' + options.img + '"/>');
  $("img").bind("contextmenu", function (e) {
    return false;
  });
  $('[name="export_form"] .title').text(options.fileName);
  // $('[name="file_name"]').val(options.fileName);
  // $("body").addClass("modal-open");
  // $(".modal-backdrop").addClass("show d-block");
  // $("#exportModal").addClass("show d-block");
  $("[data-step]").addClass("d-none");
  $('[data-step="template"]').removeClass("d-none");
  $(".new-popup-wrapper").not(".misc").removeClass("d-none");
}

function closeExportModal() {
  cancelExport();
  $('[name="export_form"]').data("hash", "");
  $('[name="export_form"]').data("template", "");
  $('[name="export_form"]').data("project", "");
  $('[name="export_form"]').data("file_name", "");
  $('[name="export_form"]').data("original_title", "");
  // $("body").removeClass("modal-open");
  // $(".modal-backdrop").removeClass("show d-block");
  // $("#exportModal").removeClass("show d-block");
  $(".export-proggress").addClass("d-none");
  $(".export-proggress-title-inner").width("0%");
  $("[data-step]").addClass("d-none");
  $('[data-step="template"]').removeClass("d-none");
  $(".new-popup-wrapper").addClass("d-none");
  toggleStep("generate");
}

function openEditor(project_id, template_id, object_hash) {
  window.location = "/editor/" + project_id; // + "/" + template_id + "/" + object_hash;
}

function createProject(template_id, object_hash, cb) {
  DSHDEditorLib.createProject(
    {
      template_id: template_id,
      customizations_hash: object_hash,
    },
    function (error, project) {
      if (cb) {
        cb(error, project);
      }
    }
  );
}

function onAddFavorite(button) {
  var $template = $(button).siblings("[data-export]"),
    file_name = $template.attr("title"),
    img = $template.find("img").not(".loader").attr("src"),
    project_id = $template.data("project"),
    template_id = $template.data("template"),
    object_hash = $template.data("hash");

  fbq("trackCustom", "AddedFavorite", { template: file_name });

  createProject(template_id, object_hash, function (error, project) {
    if (!error) {
      saveProject(project.project_id, true, template_id, object_hash);
    }
  });
}

function onRemoveFavorite(button) {
  var $template = $(button).siblings("[data-export]"),
    file_name = $template.attr("title"),
    img = $template.find("img").not(".loader").attr("src"),
    project_id = $template.data("project"),
    template_id = $template.data("template"),
    object_hash = $template.data("hash");

  fbq("trackCustom", "RemovedFavorite", { template: file_name });
}

function formParams(form) {
  var $form = $(form),
    project_id = $form.data("project"),
    object_hash = $form.data("hash"),
    template_id = $form.data("template"),
    file_name = $form.data("file_name"),
    file_type = $form.data("file_type"),
    original_title = $form.data("original_title");
  return {
    project_id,
    object_hash,
    template_id,
    file_name,
    file_type,
    form: $form,
    ...$form,
  };
}

function submitted({
  project_id,
  object_hash,
  template_id,
  file_name,
  file_type,
  form,
}) {
  file_name = file_name.replace("_free", "");
  var export_params = `file_name=${file_name}&file_type=${file_type}`;

  $(".export-proggress").removeClass("d-none");

  if (project_id) {
    exportProject(project_id, export_params);
  } else {
    createProject(template_id, object_hash, function (error, project) {
      if (!error) {
        saveProject(project.project_id, false, template_id, object_hash);
        $(form).data("project", project.project_id);
        $('[data-template="' + template_id + '"]').data(
          "project",
          project.project_id
        );
        exportProject(project.project_id, export_params);
      }
    });
  }

  return false;
}

function directDownload({
  project_id,
  object_hash,
  template_id,
  file_name,
  file_type,
  templateDiv,
}) {
  file_name = file_name.replace("_free", "");
  var export_params = `file_name=${file_name}&file_type=${file_type}`;

  $(templateDiv).loading();

  if (project_id) {
    directExport(project_id, export_params, templateDiv);
  } else {
    createProject(template_id, object_hash, function (error, project) {
      if (!error) {
        saveProject(project.project_id, false, template_id, object_hash);
        $(templateDiv).data("project", project.project_id);
        $('[data-template="' + template_id + '"]').data(
          "project",
          project.project_id
        );
        directExport(project.project_id, export_params, templateDiv);
      }
    });
  }

  return false;
}

function getParameterByName(name, url = window.location.href) {
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function directExport(project_id, export_params, templateDiv) {
  var export_link = "/templates/export/" + project_id;
  var url = encodeURI(export_link + "?" + export_params);
  url = url.replace(/#/g, "%23");
  $.get(url, function (res) {
    var downloaded = false;
    window.exportInterval = setInterval(function () {
      $.get(`${res.data.link}`, function (res) {
        if (res.data.download_url && !downloaded) {
          downloaded = true;
          cancelExport();
          window.exportTimeout = setTimeout(function () {
            $(templateDiv).stopLoading();
            if (res.data.local) {
              const link = document.createElement("a");
              link.href = res.data.download_url;
              const params = new Proxy(new URLSearchParams(url), {
                get: (searchParams, prop) => searchParams.get(prop),
              });
              link.download = getParameterByName("file_name", url);
              link.click();
            } else {
              window.location.href = res.data.download_url;
            }
          }, 1000);
        }
      });
    }, 1000);
  });
}

function exportProject(project_id, params) {
  var export_link = "/templates/export/" + project_id;
  var url = encodeURI(export_link + "?" + params);
  url = url.replace(/#/g, "%23");
  $.get(url, function (res) {
    if ($(".export-proggress").is(":visible")) {
      checkJobProggress(`${res.data.link}`, url);
    }
  });
}

function checkJobProggress(link, url) {
  var downloaded = false;
  window.exportInterval = setInterval(function () {
    $.get(link, function (res) {
      if (res.data.download_url && !downloaded) {
        downloaded = true;
        cancelExport();
        $(".export-proggress-title-inner").width("100%");
        window.exportTimeout = setTimeout(function () {
          if (res.data.local) {
            const link = document.createElement("a");
            link.href = res.data.download_url;
            link.download = getParameterByName("file_name", url);
            link.click();
          } else {
            window.location.href = res.data.download_url;
          }
          closeExportModal();
        }, 1000);
      } else {
        $(".export-proggress-title-inner").width(
          res.data.progress_percentage + "%"
        );
      }
    });
  }, 1000);
}

function cancelExport() {
  clearInterval(window.exportInterval);
  clearTimeout(window.exportTimeout);
}

function saveProject(projectId, isFavorite, template_id, custom_hash) {
  $.post("/projects/save/" + projectId + "?favorite=" + (isFavorite || false), {
    template_id,
    custom_hash,
  });
}

function validate_ai_field(row_class_name) {
  var valid = true;
  var message = "";

  var isLink = row_class_name === "Link";

  if (isLink) {
    $(".ai_field").each(function () {
      var $this = $(this);

      if (!$this.val() || !$this.val().includes("http")) {
        valid = false;
        message = "Invalid URL. Please enter a valid URL.";
      }
    });
  }

  return { valid, message };
}

function resetSwiper(elm) {
  if (elm) {
    var oldSwiper = elm.closest(".item-wrapper").find(".swiper");
    oldSwiper.append(`<div class="swiper-button-prev hidden"></div>`);
    oldSwiper.append(`<div class="swiper-button-next hidden"></div>`);
  } else {
    $(".swiper").append(`<div class="swiper-button-prev hidden"></div>`);
    $(".swiper").append(`<div class="swiper-button-next hidden"></div>`);
  }

  var swiper = new Swiper(".swiper", {
    slidesPerView: "auto",
    spaceBetween: 14,
    mousewheel: true,
    observer: true,
    observeParents: true,
    rebuildOnUpdate: true,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });

  $(".item-wrapper").hover(
    function () {
      $(".swiper-button-prev").removeClass("hidden");
      $(".swiper-button-next").removeClass("hidden");
    },
    function () {
      $(".swiper-button-prev").addClass("hidden");
      $(".swiper-button-next").addClass("hidden");
    }
  );
}

function generate(row) {
  if (row) {
    const row_class_name =
      row.filterRefs && row.filterRefs.length
        ? row.filterRefs[0].name
        : row.name;

    const validity = validate_ai_field(row_class_name);
    if (!validity.valid) {
      alert(validity.message);
      return;
    }

    const selectedSegment = $(".gen-seg .option input:checked");
    const sizeID = !window.location.pathname.includes("newsroom")
      ? selectedSegment.attr("id").replace("gen-seg-", "")
      : -1;

    if (sizeID && row.sizes && row.sizes.length && row.rowQuery) {
      let default_size = row.sizes.find((size) => {
        return size._id === sizeID;
      });

      if (default_size) {
        row.rowQuery.size = {
          width: default_size.width,
          height: default_size.height,
        };
      } else {
        row.rowQuery.size = {
          width: row.sizes[0].width,
          height: row.sizes[0].height,
        };
      }
    } else if (row.sizes && row.sizes.length && row.rowQuery) {
      row.rowQuery.size = {
        width: row.sizes[0].width,
        height: row.sizes[0].height,
      };
    } else {
      alert("No query found!");
      return;
    }

    $(".ai-input-wrapper").loading();

    $.post(`/generator/generate/${row._id}`, {
      row_size: row.rowQuery.size,
    })
      .then(function (res) {
        if (!res.success || !res.row) {
          $(".ai-input-wrapper").stopLoading();
          alert(
            (res.error && res.error.message) || "Failed to get information."
          );
          return;
        } else if (!res.row.templates || !res.row.templates.length) {
          $(".ai-input-wrapper").stopLoading();
          alert("No templates found.");
          return;
        }

        if (
          res.success &&
          res.row &&
          res.row.templates &&
          res.row.templates.length
        ) {
          $(".ai-input-wrapper").stopLoading();

          const isNewsroom = window.location.pathname.includes("newsroom");
          if (isNewsroom) {
            const $closest = $(".swiper");
            $closest.load(
              window.location.pathname + "/refetch" + " .single-swiper-wrapper",
              { row_name: decodeURI(row_class_name) },
              function (res) {
                window.refreshRow = $closest;
                getCustomization(
                  { runAI: true, row_class_name: row_class_name },
                  null,
                  function () {
                    resetSwiper();
                  }
                );
              }
            );
            return;
          }

          toggleStep("template");

          var template = res.row.templates[0];

          var exportFileName = template.template_title,
            img = template.thumbnail_url,
            project_id = template.project_id,
            template_id = template.template_id,
            hash = template.hash,
            original_title = template.template_title;

          openTemplateModal({
            fileName: exportFileName,
            img,
            project_id,
            template_id,
            hash,
            original_title,
          });

          var $template = $(".template");
          showLoader($template);

          var $form = $template.closest('[name="export_form"]');
          $form
            .find(".new-popup-footer")
            .css({ opacity: 0.3, "pointer-events": "none" });

          getCustomization(
            { row_class_name: row_class_name },
            function (data, err) {
              if (data && data.object_hash) {
                DSHDEditorLib.getVariableTemplatePreviewURL(
                  {
                    template_id: template.template_id,
                    customizations_hash: data.object_hash,
                    width: 600,
                  },
                  function (error, image_url) {
                    if (!error) {
                      var preview_image = new Image();
                      preview_image.src = image_url;
                      preview_image.style.objectFit = "cover";
                      preview_image.onload = function () {
                        // var $form = $template.closest('[name="export_form"]');

                        $form.find(".new-popup-footer").css({
                          opacity: 1.0,
                          "pointer-events": "auto",
                        });

                        $form.data("hash", data.object_hash);
                        $template.data("hash", data.object_hash);
                        $template
                          .find("img")
                          .not(".loader")
                          .replaceWith(preview_image);
                        $("img").bind("contextmenu", function (e) {
                          return false;
                        });
                        $template
                          .find("img")
                          .not(".loader")
                          .first()
                          .addClass("blur-template");
                        hideLoader($template);
                      };
                      preview_image.onerror = function () {
                        hideLoader($template);
                        closeExportModal();
                        toggleStep("generate");
                        alert("Failed to load template.");
                        const usage = res.usage;
                        $.post(`/generator/usage/${usage._id}/delete`);
                        return;
                      };
                    } else {
                      console.log(error);
                      hideLoader($template);
                      closeExportModal();
                      toggleStep("generate");
                      alert(JSON.stringify(error));
                      return;
                    }
                  }
                );
              } else {
                console.log(data, err);
                hideLoader($template);
                closeExportModal();
                toggleStep("generate");
                alert("Failed load to template.");
                return;
              }
            }
          );
        } else {
          $(".ai-input-wrapper").stopLoading();
          alert("Failed to get templates.");
          return;
        }
      })
      .catch(function (err) {
        console.log(err);
        $(".ai-input-wrapper").stopLoading();
        alert(JSON.stringify(err));
      });
  }
}
