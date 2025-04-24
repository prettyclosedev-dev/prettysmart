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
      template_id = $template.data("template"),
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
      template_id,
      file_name,
      file_type,
      templateDiv: $(this).closest(".template"),
    });
    return false;
  })
  .on("click", "[data-editor]", function () {
    var $form = $(this).closest("form"),
      template_id = $form.data("template");

    const imgSrc = $(this).closest("form").find("img").attr("src");

    console.log("imgSrc", imgSrc);

    if (imgSrc) window.location.href = "/editor/branded-design/" + template_id;

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
        encodeURI("/templates/resize?row=" + rowID + "&size=" + sizeID) +
          " .single-swiper-wrapper",
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
  .on("click", ".load-more", function () {
    var $button = $(this);

    var originalText = $button.html();

    $button
      .addClass("loading-anim")
      .html('Loading... <i class="fa fa-spinner spinner"></i>');

    var categoryId = $button.data("category-id");
    var currentPage = parseInt($button.attr("data-current-page"), 10);
    var totalPages = parseInt($button.attr("data-total-pages"), 10);

    var $itemWrapper = $button.closest(".item-wrapper");
    var segment = $itemWrapper.find(
      ".segment-item:checked, .segment-item[checked]"
    );
    if (segment.length > 1) {
      segment = segment.eq(1);
    }
    const selectedSize = segment.val();
    console.log("selectedSize", selectedSize);

    if (currentPage < totalPages) {
      $.ajax({
        url: `/templates/load-more/${categoryId}`,
        type: "GET",
        data: {
          page: currentPage + 1,
          sizeName: selectedSize, // Pass the selected size name
        },
        success: function (response) {
          if (response.length > 0) {
            var $templatesContainer = $(`#swiper-wrapper-${categoryId}`);
            var $loadMoreSlide = $(`#load-more-slide-${categoryId}`);

            $loadMoreSlide.remove();

            var newTemplates = [];

            response.forEach(function (template) {
              var templateHtml = `
                <div class="swiper-slide">
                  <div class="template">
                    <div
                      data-template="${template.id}"
                      data-export
                      class="template d-block rounded"
                      original_title="${template.name.replace("_free", "")}"
                      title="${template.name.replace("_free", "")}"
                    >
                      <img
                        src="${template.preview}"
                        alt=""
                        class="rounded LoNotSensitive"
                      />
                      <div class="template-loader">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                          viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve">
                          <rect fill="none" stroke="#F7176D" stroke-width="4" x="25" y="25" width="50" height="50">
                            <animateTransform attributeName="transform" dur="0.5s" from="0 50 50" to="180 50 50" type="rotate"
                              id="strokeBox" attributeType="XML" begin="rectBox.end" />
                          </rect>
                          <rect x="27" y="27" fill="#F7176D" width="46" height="50">
                            <animate attributeName="height" dur="1.3s" attributeType="XML" from="50" to="0" id="rectBox"
                              fill="freeze" begin="0s;strokeBox.end" />
                          </rect>
                        </svg>
                      </div>
                    </div>
                    <div class="favorite-wrapper ${
                      template.isFavorite ? "liked" : ""
                    }">
                      <span class="like-icon">
                        <div class="heart-animation-1"></div>
                        <div class="heart-animation-2"></div>
                      </span>
                      Favorite
                    </div>
                    ${
                      template.name.includes("_free")
                        ? '<div class="tag fs14 ttuc" style="background-color: #db3965;">Free!</div>'
                        : ""
                    }
                    <div class="download-wrapper">
                      <div class="download-button primary-btn btn-group dropup" style="display: inline-flex;">
                        <button class="btn btn-med download-button-item" value="jpg" type="button" ${
                          !isAllowedDownload(template.name)
                            ? 'style="justify-content: center;" onclick="location.href=\'/plans\';"'
                            : ""
                        }>
                          ${
                            isAllowedDownload(template.name)
                              ? "Download JPG"
                              : "Upgrade plan"
                          }
                        </button>
                        ${
                          isAllowedDownload(template.name)
                            ? `
                        <button type="button" class="btn btn-med dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                          <span class="sr-only">Select download type</span>
                          <i class="fa-regular fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu dropdown-menu-right">
                          <button class="dropdown-item download-button-item" value="png">Download PNG</button>
                          <button class="dropdown-item download-button-item" value="pdf">Download PDF</button>
                          <button class="dropdown-item download-button-item" value="pdf_flattened">Download PDF Flattened</button>
                        </div>`
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                </div>`;

              var $templateElement = $(templateHtml);
              $templatesContainer.append($templateElement);

              // Push only the .template div to the newTemplates array
              newTemplates.push($templateElement.find(".template")[1]);
            });

            $templatesContainer.append($loadMoreSlide);

            currentPage += 1;
            $button.attr("data-current-page", currentPage);

            if (currentPage >= totalPages) {
              $loadMoreSlide.hide();
            }

            var swiperInstance = getSwiperInstanceFromButton($itemWrapper);
            swiperInstance.update();

            // Call getCustomization with only the newly added .template elements
            getCustomization({ templates: newTemplates });
          } else {
            $(`#load-more-slide-${categoryId}`).hide();
          }
        },
        error: function (error) {
          console.error("Error loading more templates:", error);
        },
        complete: function () {
          $button.removeClass("loading-anim").html(originalText);
        },
      });
    }
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

function getSwiperInstanceFromButton($itemWrapper) {
  var swiperContainer = $itemWrapper.find(".swiper");

  // Create a Swiper instance based on that container
  var swiperInstance =
    swiperContainer.length > 0 ? swiperContainer[0].swiper : null;

  return swiperInstance;
}

function getCustomization(options, cb, icb) {
  var $templates;

  if (options && options.templates && options.templates.length > 0) {
    $templates = $(options.templates); // Use the provided templates
  } else {
    $templates = $(".template"); // Fallback to all elements with class .template
  }

  // Create an IntersectionObserver instance
  const observer = new IntersectionObserver((entries, observer) => {
    // Collect promises for visible templates
    const requests = entries
      .filter((entry) => entry.isIntersecting) // Only process templates in view
      .map((entry) => {
        const $template = $(entry.target);
        const template_id = $template.data("template");
        if (!template_id) {
          observer.unobserve(entry.target); // Stop observing if no template_id
          return Promise.resolve(); // Return a resolved promise for skipped templates
        }

        const $itemWrapper = $template.closest(".item-wrapper");
        var segment = $itemWrapper.find(
          ".segment-item:checked, .segment-item[checked]"
        );
        if (segment.length > 1) {
          segment = segment.eq(1);
        }
        const selectedSize = segment.val();
        const defaultSize = $itemWrapper.data("default-size");

        let templateHeight = defaultSize ? defaultSize : "300px";

        // Check if the URL includes 'collateral'
        if (window.location.href.includes("collateral")) {
          const itemId = $itemWrapper.attr("id");
          if (!defaultSize) {
            if (itemId === "105") {
              templateHeight = "100px"; // Facebook cover
            } else if (itemId === "112" || itemId === "114") {
              templateHeight = "150px"; // Business card, Zoom background
            } else {
              templateHeight = "300px"; // Default for collateral pages
            }
          }
        } else {
          // Use segment size if it's different from default size
          if (selectedSize && selectedSize !== defaultSize) {
            switch (selectedSize) {
              case "Horizontal":
                templateHeight = "250px";
                break;
              case "Vertical":
                templateHeight = "525px";
                break;
              case "Square":
                templateHeight = "300px";
                break;
            }
          }
        }

        $template.css("min-height", templateHeight);

        // Fetch preview for the template
        const request = $.get("/templates/preview/" + template_id)
          .then(function (preview) {
            var preview_image = new Image();
            preview_image.src = preview.includes("data:image")
              ? preview
              : "data:image/png;base64," + preview;
            preview_image.onload = function () {
              $template.find("img").not(".loader").replaceWith(preview_image);
              $("img").bind("contextmenu", function (e) {
                return false;
              });
            };
            preview_image.onerror = function () {
              hideLoader($template);
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
            hideLoader($template);
          })
          .catch(function (e) {
            console.log(e);
            hideLoader($template);
            $template
              .find("img")
              .not(".loader")
              .attr(
                "src",
                `/static/images/failed_${
                  selectedSize ? selectedSize.toLowerCase() : "horizontal"
                }@4x.jpg`
              );
            hideLoader($template);
          });

        observer.unobserve(entry.target); // Stop observing once loaded

        return request; // Return the promise
      });

    // Wait for all visible template previews to load
    Promise.all(requests).then(() => {
      if (cb) cb(); // Callback after all previews are loaded
      if (icb) icb(); // Another callback if needed
    });
  });

  // Observe each template
  $templates.each(function () {
    observer.observe(this); // Start observing the template
  });
}

function initTemplates(opts, cb) {
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

  $("[data-step]").addClass("d-none");
  $('[data-step="template"]').removeClass("d-none");
  $(".new-popup-wrapper").not(".misc").removeClass("d-none");

  // Reset progress bar at start
  $(".export-proggress-title-inner").width("0%");
}

function closeExportModal() {
  cancelExport();
  $('[name="export_form"]').data("hash", "");
  $('[name="export_form"]').data("template", "");
  $('[name="export_form"]').data("project", "");
  $('[name="export_form"]').data("file_name", "");
  $('[name="export_form"]').data("original_title", "");
  $(".export-proggress").addClass("d-none");
  $(".export-proggress-title-inner").width("0%");
  $(".new-popup-wrapper").addClass("d-none");
  toggleStep("generate");
}

function formParams(form) {
  const $form = $(form);
  const template_id = $form.data("template");
  const file_name = $form.data("file_name").replace("_free", "");
  const file_type = $form.data("file_type");

  return {
    template_id,
    file_name,
    file_type,
    form: $form,
  };
}

function simulateProgress() {
  let progress = 0;
  const progressInterval = setInterval(function () {
    if (progress >= 95) {
      clearInterval(progressInterval); // Stop the progress before it reaches 100%
    } else {
      progress += Math.random() * 5; // Increment the progress bar
      $(".export-proggress-title-inner").width(`${progress}%`);
    }
  }, 500); // Update progress every 500ms
}

function submitted({ template_id, file_name, file_type, form }) {
  file_name = file_name.replace("_free", ""); // Clean up the file name
  const export_params = `file_name=${file_name}&file_type=${file_type}`;

  // Start the progress UI immediately
  $(".export-proggress").removeClass("d-none");

  // Simulate the progress bar moving forward
  simulateProgress();

  // Start the export process
  exportTemplate(template_id, export_params);

  return false;
}

function directDownload({ template_id, file_name, file_type, templateDiv }) {
  file_name = file_name.replace("_free", ""); // Clean up the file name
  const export_params = `file_name=${file_name}&file_type=${file_type}`;

  // Start the loading indicator on the template div
  $(templateDiv).loading();

  // Show the progress UI
  $(".export-proggress").removeClass("d-none");

  // Simulate progress
  simulateProgress();

  // Initiate the direct export
  directExport(template_id, export_params, templateDiv);

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

function directExport(template_id, export_params, templateDiv) {
  const export_link = `/templates/export/${template_id}`;
  const url = encodeURI(`${export_link}?${export_params}`);

  // Make the request to export the file
  $.get({
    url: url,
    xhrFields: {
      responseType: "blob", // Expect binary data (Blob) as the response
    },
    success: function (res) {
      let downloaded = false;

      window.exportInterval = setInterval(function () {
        if (!downloaded) {
          downloaded = true;
          cancelExport();

          setTimeout(function () {
            // Stop the loading indicator and progress UI
            $(templateDiv).stopLoading();
            $(".export-proggress-title-inner").width("100%");

            // Create a Blob from the response data (res is already a Blob)
            const blob = new Blob([res], { type: res.type });
            const link = document.createElement("a");
            const fileName = getParameterByName("file_name", url); // Extract filename from params

            // Create a download link
            link.href = URL.createObjectURL(blob);
            link.download = fileName || "downloaded_file";
            link.click();

            // Close the export modal after a short delay
            setTimeout(closeExportModal, 1000);
          }, 1000);
        }
      }, 1000);
    },
    error: function () {
      console.error("Error during file export");
    },
  });
}

function exportTemplate(template_id, export_params) {
  const export_link = `/templates/export/${template_id}`;
  const url = encodeURI(`${export_link}?${export_params}`);

  // Make the request to export the file with Blob handling
  $.get({
    url: url,
    xhrFields: {
      responseType: "blob", // Expect binary data as Blob
    },
    success: function (res) {
      $(".export-proggress-title-inner").width("100%");

      const blob = new Blob([res], { type: res.type });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = getParameterByName("file_name", url) || "downloaded_file";
      link.click();

      setTimeout(closeExportModal, 1000);
    },
    error: function () {
      console.error("Error during file export");
    },
  });
}

function checkJobProgress(link, url) {
  let downloaded = false;

  window.exportInterval = setInterval(function () {
    $.get(link, function (res) {
      if (res.data.download_url && !downloaded) {
        downloaded = true;
        cancelExport();
        $(".export-proggress-title-inner").width("100%");

        setTimeout(function () {
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
      } else if (res.data.progress_percentage) {
        // Update progress based on backend
        $(".export-proggress-title-inner").width(
          `${res.data.progress_percentage}%`
        );
      }
    });
  }, 1000);
}

function cancelExport() {
  clearInterval(window.exportInterval);
  clearTimeout(window.exportTimeout);
}

function saveProject(isFavorite, designId) {
  const endpoint = isFavorite
    ? "/templates/addFavorite"
    : "/templates/removeFavorite";

  $.post(endpoint, { designId }, function (response) {
    if (response.success) {
      console.log("Favorite updated successfully");
    } else {
      console.error("Error updating favorite:", response.error);
    }
  });
}

function onAddFavorite(button) {
  const $template = $(button).siblings("[data-export]");
  const designId = $template.data("template");

  fbq("trackCustom", "AddedFavorite", { template: designId });

  saveProject(true, designId);
}

function onRemoveFavorite(button) {
  const $template = $(button).siblings("[data-export]");
  const designId = $template.data("template ");

  fbq("trackCustom", "RemovedFavorite", { template: designId });

  saveProject(false, designId);
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
              if (data) {
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
