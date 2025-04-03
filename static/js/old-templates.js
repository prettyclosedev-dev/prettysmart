var object_hash;

DSHDEditorLib.configure({
  access_token: TOKEN,
  domain: "prettysmart.designhuddle.com",
});

getCustomization();

$(document)
  .on("click", '[data-toggle="modal"]', function () {
    var target = $(this).data("target");

    $("body").addClass("modal-open");
    $(".modal-backdrop").addClass("show d-block");
    $(target).addClass("show d-block");

    return false;
  })
  .on("click", ".modal .close", function () {
    closeExportModal();

    return false;
  })
  .on("click", "[data-export]", function () {
    var $template = $(this),
      exportFileName = $template.attr("title"),
      img = $template.find("img").attr("src"),
      project_id = $template.data("project"),
      template_id = $template.data("template"),
      hash = $template.data("hash");

    openTemplateModal({
      fileName: exportFileName,
      img: img,
      project_id: project_id,
      template_id: template_id,
      hash: hash,
    });
  })
  .on("change", '[name="file_type"]', function () {
    var type = $(this).val();

    if (type === "pdf" || type === "pdf_flattened") {
      $(".export-crop-marks").removeClass("d-none");
    } else {
      $(".export-crop-marks").addClass("d-none");
    }
  })
  .on("submit", '[name="export_form"]', function () {
    var $form = $(this),
      project_id = $form.data("project"),
      object_hash = $form.data("hash"),
      template_id = $form.data("template"),
      export_params = $(this).serialize();

    $(".export-proggress").removeClass("d-none");

    if (project_id) {
      exportProject(project_id, export_params);
    } else {
      DSHDEditorLib.createProject(
        {
          template_id: template_id,
          customizations_hash: object_hash,
        },
        function (error, project) {
          if (!error) {
            saveProject(project.project_id);
            $form.data("project", project.project_id);
            $('[data-template="' + template_id + '"]').data(
              "project",
              project.project_id
            );
            exportProject(project.project_id, export_params);
          }
        }
      );
    }

    return false;
  })
  .on("click", "[data-editor]", function () {
    var $form = $(this).closest("form"),
      project_id = $form.data("project"),
      object_hash = $form.data("hash"),
      template_id = $form.data("template"),
      export_params = $(this).serialize();

    $(".export-proggress").removeClass("d-none");

    if (project_id) {
      openEditor(project_id);
    } else {
      DSHDEditorLib.createProject(
        {
          template_id: template_id,
          customizations_hash: object_hash,
        },
        function (error, project) {
          if (!error) {
            saveProject(project.project_id);
            $form.data("project", project.project_id);
            $('[data-template="' + template_id + '"]').data(
              "project",
              project.project_id
            );
            openEditor(project.project_id);
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
    $(this)
      .closest(".dashboard-category")
      .find("[data-ready-size].active")
      .click();

    return false;
  })
  .on("click", "[data-ready-size]", function (e) {
    e.preventDefault();

    var $this = $(this),
      size = $this.data("size"),
      row = $this.data("row"),
      tag = $this.data("tag"),
      page = $this.data("page"),
      see_all = $this.closest(".dashboard-category").find(".arrow-link"),
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
    $(this)
      .closest(".dashboard-category, .templates-page")
      .find(".template-loader")
      .show();
    $(this)
      .closest(".dashboard-category, .templates-page")
      .find(".templates-row-container")
      .load(encodeURI($this.attr("href")) + " .templates-row", function () {
        //initTemplates()
        window.refreshRow = $this;
        getCustomization();
      });

    return false;
  });

function getCustomization(options, cb) {
  var ai_fields = {},
    queryFields = [];

  $(".ai_field").each(function () {
    if ($(this).val()) {
      ai_fields[$(this).attr("name")] = $(this).val();
    }
  });

  if (options && options.ignoreCache) {
    queryFields.push("ignoreCache=" + options.ignoreCache);
  }

  if (
    location.pathname.indexOf("onboarding") > -1 ||
    location.pathname.indexOf("brand") > -1
  ) {
    queryFields.push("onboarding=1");
  }

  $.ajax({
    type: "POST",
    url: "/customization?" + queryFields.join("&"),
    data: JSON.stringify({
      ai_fields: ai_fields,
      brand: options && options.brand,
    }),
    dataType: "json",
    contentType: "application/json",
    success: function (classes) {
      DSHDEditorLib.storeTemplateCustomizationObject(
        {
          object: {
            classes: classes,
          },
        },
        function (err, data) {
          if (data.object_hash) {
            object_hash = data.object_hash;
            initTemplates();
          }

          if (cb) {
            cb();
          }
        }
      );
    },
  });
}

function initTemplates() {
  if (!object_hash) {
    return;
  }
  var $templates = window.refreshRow
    ? window.refreshRow.closest(".dashboard-category").find("[data-template]")
    : $("[data-template]");
  $templates.each(function () {
    var $template = $(this),
      template_id = $template.data("template");

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
            $template.find("img").replaceWith(preview_image);
            $template.find(".template-loader").fadeOut(300);
          };
        }
      }
    );
  });
}

function openExportsModal(options) {
  var export_link = "/templates/export/" + options.project_id,
    editor_link = "/editor/" + options.project_id;
  $('[name="export_form"]').attr("action", export_link);
  $('[name="export_form"] [data-editor]').attr("href", editor_link);
  $('[name="export_form"] .template').html('<img src="' + options.img + '"/>');
  $('[name="export_form"] h3').text(options.fileName);
  $('[name="file_name"]').val(options.fileName);
  $("body").addClass("modal-open");
  $(".modal-backdrop").addClass("show d-block");
  $("#exportModal").addClass("show d-block");
}

function openTemplateModal(options) {
  $('[name="export_form"]').data("hash", options.hash);
  $('[name="export_form"]').data("template", options.template_id);
  $('[name="export_form"]').data("project", options.project_id);
  $('[name="export_form"] .template').html('<img src="' + options.img + '"/>');
  $('[name="export_form"] h3').text(options.fileName);
  $('[name="file_name"]').val(options.fileName);
  $("body").addClass("modal-open");
  $(".modal-backdrop").addClass("show d-block");
  $("#exportModal").addClass("show d-block");
}

function closeExportModal() {
  cancelExport();
  $('[name="export_form"]').data("hash", "");
  $('[name="export_form"]').data("template", "");
  $('[name="export_form"]').data("project", "");
  $("body").removeClass("modal-open");
  $(".modal-backdrop").removeClass("show d-block");
  $("#exportModal").removeClass("show d-block");
  $(".export-proggress").addClass("d-none");
  $(".export-proggress-title-inner").width("0%");
}

function openEditor(project_id) {
  window.location = "/polotno/" + project_id;
}

function exportProject(project_id, params) {
  var export_link = "/templates/export/" + project_id;
  $.get(export_link + "?" + params, function (res) {
    if ($(".export-proggress").is(":visible")) {
      checkJobProggress(res.data.link);
    }
  });
}

function checkJobProggress(link) {
  window.exportInterval = setInterval(function () {
    $.get(link, function (res) {
      if (res.data.download_url) {
        cancelExport();
        $(".export-proggress-title-inner").width("100%");
        setTimeout(function () {
          window.location.href = res.data.download_url;
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
}

function saveProject(projectId) {
  $.get("/projects/save/" + projectId);
}
