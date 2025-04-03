(function($) {
    var loaders = 0,
        svgLoader = `<div>
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
        </div>`;
        
    jQuery.fn.loading = function(size) {
        return this.each(function() {
          var $this = $(this),
              parentOffset = $this.offsetParent().offset(),
              offset = $this.offset(),
              loader = $("<div class='ajaxLoadingSvg'>" + svgLoader + "</div>").clone().prop("id", "ajaxLoadingSvg" + loaders++),
              fromTop = $this.height() < $(window).height() ? offset.top - parentOffset.top : ($this.closestOffset() !== $this ? ($this.offset().top - $this.closestOffset().offset().top) / 2 : 0) + $this.closestOffset().getVisibleCenter() - 16,
              fromLeft = offset.left - parentOffset.left,
              width = $this.outerWidth(),
              height = $this.outerHeight();
    
          $this.addClass('loading');
    
          loader.css({
            display: "flex",
            justifyContent: 'center',
            alignItems: 'center',
            top: fromTop,
            left: fromLeft,
            position: "absolute",
            zIndex: 9011,
            width:width,
            height:height,
            padding:0
          });
          $this.data("loader", loader.attr("id")).after(loader);
        });
    };
    
    jQuery.fn.stopLoading = function() {
        return this.each(function() {
          var $this = $(this);
          if ($this.data("loader") !== null) {
            $("#" + $this.data("loader")).remove();
            $this.removeData("loader");
          }
          if ($this.find(".ajaxLoadingSvg").length > 0) {
            $this.find(".ajaxLoadingSvg").remove();
          } else {
            $this.parent().find(".ajaxLoadingSvg").remove();
          }
          $this.removeClass('loading');
        });
    };
      
      jQuery.fn.closestOffset = function(){
        var $this = this, pos = $this.css("position");
        switch(pos){
            case "absolute" :
            case "fixed" :
            case "relative" :
                return $this;
            default :
                return $this.offsetParent();
        }
    };
    jQuery.fn.getVisibleCenter = function(rel){//needs Modification
        var $w = $(window), 
            $this = this,
            eOffset = $this.offset(),
            eHeight = $this.height(),
            wHeight = $w.height(),
            wScrollT = $w.scrollTop(),
            eBottom = eOffset.top + eHeight,
            pageVisBottom = wScrollT + wHeight,
            diff, visible, visibleStart, pos;
    
            //if bottom edge of elem is visible
            if(pageVisBottom > eBottom){
                diff = pageVisBottom - eBottom;
                visible = wHeight - diff;
                visibleStart = eHeight - visible;
                pos = visibleStart + visible / 2; 
            }
            //if top edge is visible
            else if(wScrollT < eOffset.top){
                diff = eOffset.top - wScrollT;
                visible = wHeight - diff;
                pos = visible / 2;
    
            }
            //none of edges is visible
            else {
                visible = wHeight;
                visibleStart = wScrollT - eOffset.top;
                pos =  visibleStart + visible / 2;
            }
            return pos;
    };
    })(jQuery);