/* global define, app, jsPDF*/
define([
  'app/config',
  'app/data/sunHours',

  'dojo/_base/lang',

  'components/map/controller/mapController',
  'components/report/controller/imageUri',
  'components/query/controller/queryController',

  'esri/graphic',
  'esri/layers/ArcGISImageServiceLayer',
  'esri/layers/GraphicsLayer',
  'esri/layers/ImageServiceParameters',
  'esri/layers/RasterFunction',
  'esri/map',
  'esri/toolbars/draw',
  'esri/toolbars/edit'

  ],

  function(
    config, sunHours,

    lang,

    mapController, imageUri, queryController,

    Graphic, ImageLayer, GraphicsLayer, ImageParams, RasterFunction, Map, Draw, Edit
    ) {

    return {

      buildReport: function(){
      // init layout
      this.layoutReport();

      $('#pdfButton').on('click', this.underConstruction);

      this.buildResults();

      this.buildSolarMap();
      this.buildAerialMap();

      // this.buildMap('reportSolarMap', 'reportSolarMap-container', 'solar');
      // this.buildMap('reportAerialMap','reportAerialMap-container', 'hybrid');

      // Sync maps
      app.reportSolarMap.on('pan-end', function(){
        var extent = app.reportSolarMap.extent;
        app.reportAerialMap.setExtent(extent);
      });

      // Second map is causing stack issue, researching how to resolve
      // app.reportAerialMap.on('pan-end', function(){
      //   var extent = app.reportAerialMap.extent;
      //   app.reportSolarMap.setExtent(extent);
      // });


      // create histos
      // 
      // clear content (from previous click)
      queryController.clearDiv($('#reportResultsHisto'));
      queryController.clearDiv($('#reportSunHrsHisto'));
      queryController.clearDiv($('#reportShadeHrsHisto'));

      // draw insol hours chart
      var reportInsolChart = app.charts.insolChart;
      reportInsolChart.el = '#reportResultsHisto';
      reportInsolChart.className = 'reportChart';
      queryController.drawChart(reportInsolChart);

      // draw sun hours chart
      var reportSunHrsChart = app.charts.sunHrsChart;
      reportSunHrsChart.el = '#reportSunHrsHisto';
      reportSunHrsChart.className = 'reportChart';
      queryController.drawChart(reportSunHrsChart);

      // draw shade hours chart
      var reportShadeHrsChart = app.charts.shadeHrsChart;
      reportShadeHrsChart.el = '#reportShadeHrsHisto';
      reportShadeHrsChart.className = 'reportChart';
      queryController.drawChart(reportShadeHrsChart);

      this.buildTable('#reportResultsTable', app.solarObj, 'insolValue', app.solarObj.months);
      this.buildTable('#reportSunHrsTable', app.solarObj, 'sunHrValue', app.solarObj.months);
      this.buildTable('#reportShadeHrsTable', app.solarObj, 'shadeHrValue', app.solarObj.months);
      
    },

    layoutReport: function(){
    },

    buildResults: function(){
      // Set solar values
      $('#reportTotalPerYear').html(
        parseFloat(app.query.totalPerYear).toFixed(2) + ' kWh/m<sup>2</sup>'
        );
      $('#reportAveragePerDay').html(
        parseFloat(app.query.averagePerDay).toFixed(2) + ' kWh/m<sup>2</sup>'
        );

      $('#collectDate').text(app.query.collectDate);
      $('#quality').text(app.query.quality);

      // Set get started link
      var getStarted = '<a href="' + config.mnInstallers + app.query.utilityCompany.zip + '" target="_blank">Contact a Local Installer</a>';
      $('#reportGetStarted').html(getStarted);
      var incentives = '<a href="' + config.mnIncentives + '" target="_blank">MN Solar Incentives</a>';
      $('#reportIncentives').html(incentives);

      // Set utilities
      $('#reportUtilityName').text(app.query.utilityCompany.fullName);
      $('#reportUtilityStreet').text(app.query.utilityCompany.street);
      $('#reportUtilityCityStateZip').text(app.query.utilityCompany.city + ', MN ' + app.query.utilityCompany.zip);
      $('#reportUtilityPhone').text(app.query.utilityCompany.phone);

      //console.log(app.query.results);
      //queryController.displayResults(app.query.results);
      // console.log(app.solarObj);
      // this.buildTable('#reportResultsTable', app.solarObj, 'insolValue', app.solarObj.months);
      // this.buildTable('#reportSunHrsTable', app.solarObj, 'sunHrValue', app.solarObj.months);
      // this.buildTable('#reportShadeHrsTable', app.solarObj, 'shadeHrValue', app.solarObj.months);
    },

    buildSolarMap: function(){
      var params = new ImageParams();

      // Direct call to raster function to symbolize imagery with color ramp (setting default was unreliable)
      var rasterFunction = new RasterFunction();
      rasterFunction.functionName = 'solarColorRamp';
      rasterFunction.variableName = 'Raster';
      params.renderingRule = rasterFunction;
      params.noData = 0;

      var solarLayer = new ImageLayer(config.solarImageryUrl, {
        id: 'solar',
        imageServiceParameters: params,
        showAttribution: false,
        opacity: 1.0
      });

      if (!app.reportSolarMap){
        app.reportSolarMap = new Map('reportSolarMap-container', {
          basemap: 'solar',
          center: [app.query.latLngPt.x, app.query.latLngPt.y],
          showAttribution: false,
          zoom: 18,
          minZoom: 18,
        });
        app.reportSolarMap.addLayer(solarLayer);
        app.reportSolarMap.on('load', function(){
          mapController.placePoint(app.query.latLngPt, app.reportSolarMap, config.pinSymbol);
        });
      } else {

        // Remove old point, move map to new point, add new point
        mapController.clearGraphics(app.reportSolarMap);
        mapController.centerMap(app.query.latLngPt, app.reportSolarMap);
        mapController.placePoint(app.query.latLngPt, app.reportSolarMap, config.pinSymbol);
      }
    },

    buildAerialMap: function(){
      if (!app.reportAerialMap){
        app.reportAerialMap = new Map('reportAerialMap-container', {
          basemap: 'hybrid',
          center: [app.query.latLngPt.x, app.query.latLngPt.y],
          showAttribution: false,
          zoom: 18,
          minZoom: 18,
        });

        var reportSolarArrayLayer = new GraphicsLayer({
          id: 'reportSolarArray'
        });
        app.reportAerialMap.addLayer(reportSolarArrayLayer);
      } else {
        // Move map
        mapController.centerMap(app.query.latLngPt, app.reportAerialMap);
      }
    },

    // buildMap: function(mapName, el, basemap){

    //   if (!app[mapName]){
    //     app[mapName] = new Map(el, {
    //       basemap: basemap,
    //       center: [app.query.latLngPt.x, app.query.latLngPt.y],
    //       showAttribution: false,
    //       zoom: 18,
    //       minZoom: 18,
    //     });

    //     if (mapName === 'reportSolarMap'){
    //       app[mapName].addLayer(solarLayer);
    //       app[mapName].on('load', function(){
    //         mapController.placePoint(app.query.latLngPt, app[mapName], config.pinSymbol);
    //       });

    //     } else {
    //       var reportSolarArrayLayer = new GraphicsLayer({
    //         id: 'reportSolarArray'
    //       });
    //       app[mapName].addLayer(reportSolarArrayLayer);
    //       app[mapName].on('load', lang.hitch(this, function(){
    //         //Solar panel disabled for statefair -AJW
    //         //mapController.placePoint(app.query.latLngPt, app[mapName], config.solarPanelSymbol);
    //         this.initEdit();
    //       }));
    //     }

    //   } else {
    //     mapController.removePoint(app[mapName]);
    //     mapController.centerMap(app.query.latLngPt, app[mapName]);
    //     if (mapName === 'reportSolarMap'){
    //       mapController.placePoint(app.query.latLngPt, app[mapName], config.pinSymbol);
    //     } else {
    //       mapController.placePoint(app.query.latLngPt, app[mapName], config.solarPanelSymbol);
    //     }

    //   }
    //   app[mapName].on('load', lang.hitch(this, function(){
    //     app[mapName].isPan = false;
    //     app[mapName].isPanArrows = true;
    //   }));

    //   app[mapName].resize();

    // },

    buildTable: function(el, data, values, ref){
      // empty the previous table
      var tableRows = el + 'tbody tr';
      $(tableRows).remove();

      var $table = $(el);
      _.each(ref, function(mon){
        var shortMonth = mon.abbr;
        var longMonth = mon.full;
        $table.find('tbody')
        .append($('<tr>')
          .append($('<td style="width:50%">')
            .text(longMonth)
            )
          .append($('<td>')
            .text(data[shortMonth][values].toFixed(2))
            )
          );
      });
    },

    underConstruction: function(){
      app.showAlert('danger','NOTICE:','This feature is currently under construction.');
    },

    // initEdit: function(){
    //   // console.log(app.reportAerialMap.graphics);
    //   var editToolbar = new Edit(app.reportAerialMap);
    //   // console.log('edit');
    //   var selected;
    //   app.reportAerialMap.graphics.on('mouse-over', function(evt) {
    //     selected = evt.graphic;
    //     app.reportAerialMap.selectedGraphic = selected;
    //   });

    //   app.reportAerialMap.on('click', function(){
    //     editToolbar.activate(Edit.MOVE, selected);
    //   });

    //   app.reportAerialMap.graphics.on('mouse-up', function(evt){
    //     // var mp = mapController.convertToGeographic(evt.mapPoint);
    //     // app.reportAerialMap.selectedGraphic.geometry.x = mp.x;
    //     // app.reportAerialMap.selectedGraphic.geometry.y = mp.y;
    //   });
    // },

    // increaseAngle: function(){
    //   $('#reportAngleBox').val( function(i, oldval) {
    //     var newVal = parseInt( oldval, 10) + 1;
    //     if (newVal >= 360){
    //       return 0;
    //     } else {
    //       return newVal;
    //     }
    //   });
    // },

    // decreaseAngle: function(){
    //   $('#reportAngleBox').val( function(i, oldval) {
    //     var newVal = parseInt( oldval, 10) - 1;
    //     if (newVal < 0){
    //       return 359;
    //     } else {
    //       return newVal;
    //     }
    //   });

    // },

    prepareForSolarArray: function(){
      app.eventDisable = true;
      // Hide resultsSmallDrawer
      $resultsSmall = $('#resultsSmall');
      $resultsSmall.hide();

      // Turn off solar layer
      app.map.getLayer('solar').hide();

      // Show edit toolbar (if more shapes are added)
      // $editToolbar = $('.editToolbar');
      // $editToolbar.show();
      
      // Show finished drawing button
      $finishedDrawing = $('.finishedDrawSolarArrayRow');
      $finishedDrawing.show();

      // Show toolbar row
      $toolbar = $('.toolbarDrawSolarArrayRow');
      $toolbar.show();

      // Center and zoom main map on point
      app.map.centerAndZoom([app.query.latLngPt.x, app.query.latLngPt.y], 18);

      // handle drawing
      this.handleSolarArrayDrawing();
    },

    handleSolarArrayDrawing: function(){
      console.log('handleSolarArrayDrawing');
      this.createToolbar();
      app.editToolbar.activate(Draw['POLYGON']);
    },

    createToolbar: function(){
      console.log('createToolbar');
      app.editToolbar = new Draw (app.map);
      app.editToolbar.on('draw-end', lang.hitch(this, function(evt){
        this.addToMap(evt);
      }));
    },

    addToMap: function(evt){
      console.log(evt.geometry);
      var symbol = config.solarPanelSymbol;
      console.log(symbol);
      var graphic = new Graphic(evt.geometry, symbol);
      console.log(graphic);
      var solarArrayLayer = app.map.getLayer('solarArray');
      var reportSolarArrayLayer = app.reportAerialMap.getLayer('reportSolarArray');
      // console.log('adding', graphic, 'to main');

      solarArrayLayer.add(graphic);
      graphic = new Graphic(evt.geometry, symbol);
      // console.log('adding', graphic, 'to small');
      reportSolarArrayLayer.add(graphic);
    },

    handleReturnFromSolarArray: function(){
      app.editToolbar.deactivate();
      app.eventDisable = false;
      // show resultsSmallDrawer
      $resultsSmall = $('#resultsSmall');
      $resultsSmall.show();

      // hide edit toolbar
      // $editToolbar = $('.editToolbar');
      // $editToolbar.hide();
      
      // Show solar layer
      app.map.getLayer('solar').show();
      
      // hide finished drawing button
      $finishedDrawing = $('.finishedDrawSolarArrayRow');
      $finishedDrawing.hide();

      // add drawing to report map
      var solarArrayLayer = app.map.getLayer('solarArray');
      app.reportAerialMap.addLayer(solarArrayLayer);

      // restore report modal
      $('#reportModal').modal('show');
    },

    createPdf: function(){
      /* orientation, units, format*/
      var doc = new jsPDF('portrait', 'in', 'letter');
      doc.page = 1;
      this. footer();

      /* USED TO SKIP A EL IF DRAWN FROM HTML */
      // var specialElementHandlers = {
      //   // '#skipMe': function(element, renderer){
      //   //   return true;
      //   // }
      // };

      // var html = $('.modal-content').html();
      
      /* NEEDS ADDITIONAL LIBRARIES */
      // doc.addHTML(html, function(){
      //   doc.save('test.pdf');
      // })

/* ONLY TAKES TEXT */
      // doc.fromHTML(
      //   $('.modal-content').get(0),  // source
      //   15,                       // xcoord
      //   15,                       // y coord
      //   {
      //     'width': 800,             // max width of content on PDF
      //     'elementHandlers': specialElementHandlers
      //   }
      // );

var solarLogo = imageUri.solarLogo;

doc.addImage(
              solarLogo,    // source
              'JPEG',       // type
              0.25,           // x coord
              0.25,           // y coord
              1,           // width
              1           // height
              );

doc.setFontSize(18);
doc.text(
              1.5,                     // x coord
              0.5,                     // y coord
              'Minnesota Solar Suitability Location Report'  // value
              );

doc.setLineWidth(0.0005);
doc.line(
  0, 1.5,
  8.5, 1.5
  );

return doc;
},

footer: function(){
      // console.log('footer');
      doc.setFontSize(8);
      doc.text(8, 10.75, 'page ' + doc.page);
      doc.page ++;
    },

    saveToPdf: function(doc){
      var docName = 'default.pdf';
      if (app.query.siteName){
        docName = app.query.siteName + '.pdf';
      }
      doc.save(docName);
    },

    printPdf: function(doc){
      console.log('printPDF');
      doc.autoPrint();
    },

  };
});
