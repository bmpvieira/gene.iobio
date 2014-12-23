// TODO ADD PROJECT INFO
// consumes data in following format
// var data = [ {name: 'somename',
//              features : [{start:someInt, end:someInt, feature_type:utr, strand:'+'},
//                          {start:someInt, end:someInt, feature_type:cds}, ...]
//            }, ... ]
//

function geneD3() {
  // defaults

  // dimensions
  var margin = {top: 30, right: 0, bottom: 20, left: 110},
      width = 800,
      height = 400;  
  // scales
  var x = d3.scale.linear(),
      y = d3.scale.linear();
  // axis
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat(tickFormatter);
  // variables 
  var trackHeight = 20,
      borderRadius = 1,
      utrHeight = undefined,
      cdsHeight = undefined,
      arrowHeight = undefined;
  //  options
  var defaults = {};
      
      
  function chart(selection, options) {
    // merge options and defaults
    options = $.extend(defaults,options);
    // set variables if not user set
    utrHeight = utrHeight || trackHeight / 2;
    arrowHeight = arrowHeight || trackHeight / 2;
    cdsHeight = cdsHeight || trackHeight;
    // determine inner height (w/o margins)
    var innerHeight = height - margin.top - margin.bottom;
    selection.each(function(data) {
       // set svg element
       var container = d3.select(this).attr('class', 'ibo-gene');      

      // Update the x-scale.
      x  .domain([ d3.min(data, function(d) { 
                     return d3.min(d.features, function(f) { return parseInt(f.start); }) 
                   }),
                   d3.max(data, function(d) { 
                     return d3.max(d.features, function(f) { return parseInt(f.end); }) 
                   }) 
                ]);
      x  .range([0, width - margin.left - margin.right]);

      // Update the y-scale.
      y  .domain([0, data.length]);
      y  .range([innerHeight , 0]);


      // Select the svg element, if it exists.
      var svg = container.selectAll("svg").data([0]);

      // Otherwise, create the skeletal chart.      
      var gEnter = svg.enter().append("svg").append('g');      
      gEnter.append("g").attr("class", "x axis").attr("transform", "translate(0," + y.range()[0] + ")");    
      var g = svg.select('g');
      
      // // add tooltip div
      var tooltip = container.selectAll(".tooltip").data([0])
        .enter().append('div')
          .attr("class", "tooltip")               
          .style("opacity", 0);

      // Update the outer dimensions.
      svg .attr("width", width)
          .attr("height", height);

      // Update the inner dimensions.
      g.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
               
      // Start gene model
      // add elements
      var transcript = g.selectAll('.transcript').data(data);
      transcript.enter().append('g')
          .attr('class', 'transcript')
          .attr('transform', function(d,i) { return "translate(0," + y(i+1) + ")"});

      transcript.selectAll('.reference').data(function(d) { return [[d.start, d.end]] })
        .enter().append('line')
          .attr('class', 'reference')
          .attr('x1', function(d) { return x(d[0])})
          .attr('x2', function(d) { return x(d[1])})                    
          .attr('y1', trackHeight/2)
          .attr('y2', trackHeight/2);

      transcript.selectAll('.name').data(function(d) { return [[d.start, d.transcript_id]] })
        .enter().append('text')
          .attr('class', 'name')
          .attr('x', function(d) { return x(d[0])-5; })
          .attr('y', trackHeight/2)
          .attr('text-anchor', 'end')
          .attr('alignment-baseline', 'middle')
          .text(function(d) { return d[1]; })
          .style('fill-opacity', 0)
      
      transcript.selectAll('.arrow').data(centerSpan)
        .enter().append('path')
          .attr('class', 'arrow')
          .attr('d', centerArrow);      
      
      transcript.selectAll('.utr').data(function(d) { 
        return d['features'].filter( function(d) { var ft = d.feature_type.toLowerCase(); return ft == 'utr' || ft == 'cds';}) 
      }).enter().append('rect')
          .attr('class', function(d) { return d.feature_type.toLowerCase();})          
          .attr('rx', borderRadius)
          .attr('ry', borderRadius)
          .attr('x', function(d) { return x(d.start)})
          .attr('width', function(d) { return x(d.end) - x(d.start)})
          .attr('y', trackHeight /2)
          .attr('height', 0)
          .on("mouseover", function(d) {  
              var tooltip = container.select('.tooltip');
              tooltip.transition()        
                 .duration(200)      
                 .style("opacity", .9);      
              tooltip.html(d.feature_type + ': ' + d.start + ' - ' + d.end)                                 
           .style("left", (d3.event.pageX) + "px") 
           .style("text-align", 'left')    
           .style("top", (d3.event.pageY - 24) + "px");    
           })                  
           .on("mouseout", function(d) {       
              container.select('.tooltip').transition()        
                 .duration(500)      
                 .style("opacity", 0);   
           });           

      // exit
      transcript.exit().remove();

      // update 
      transcript.transition()
          .duration(700)
          .attr('transform', function(d,i) { return "translate(0," + y(i+1) + ")"});

      transcript.selectAll('.reference').transition()
        .duration(700)
        .attr('x1', function(d) { return x(d[0])})
        .attr('x2', function(d) { return x(d[1])});

      transcript.selectAll('.arrow').transition()
        .duration(700)
        .attr('d', centerArrow);

      transcript.selectAll('.name').transition()
        .duration(700)
        .attr('x', function(d) { return x(d[0])-5; })
        .attr('y', trackHeight/2)   
        .text(function(d) { return d[1]; })                
        .style('fill-opacity', 1);

      transcript.selectAll('.utr,.cds').sort(function(a,b){ return parseInt(a.start) - parseInt(b.start)})
        .transition()        
          .duration(700)
          .attr('x', function(d) { return x(d.start)})
          .attr('width', function(d) { return x(d.end) - x(d.start)})
          .attr('y', function(d) { 
            if(d.feature_type.toLowerCase() =='utr') return (trackHeight - utrHeight)/2; 
            else return (trackHeight - cdsHeight)/2; })
          .attr('height', function(d) { 
            if(d.feature_type.toLowerCase() =='utr') return utrHeight; 
            else return cdsHeight; });          


      // End gene model

      // Update the x-axis.
      g.select(".x.axis").transition()
          .duration(200)
          .call(xAxis);          
    });

  }
  // moves selection to front of svg
  function moveToFront(selection) {
    return selection.each(function(){
       this.parentNode.appendChild(this);
    });
  }

  // updates the hash with the center of the biggest span between features
  function centerSpan(d) {    
    var span = 0;
    var center = 0;
    var sorted = d.features
      .filter(function(f) { var ft = f.feature_type.toLowerCase(); return ft == 'utr' || ft == 'cds'})
      .sort(function(a,b) { return parseInt(a.start) - parseInt(b.start)});

    for (var i=0; i < sorted.length-1; i++) {
      var currSpan = parseInt(sorted[i+1].start) - parseInt(sorted[i].end);
      if (span < currSpan) {
        span = currSpan;
        center = parseInt(sorted[i].end) + span/2;
      }
    }      
    d.center = center;
    return [d]; 
  }

  // generates the arrow path
  function centerArrow(d) {
    var arrowHead = parseInt(d.strand + '5');
    var pathStr = "M ";            
    pathStr += x(d.center) + ' ' + (trackHeight - arrowHeight)/2;
    pathStr += ' L ' + parseInt(x(d.center)+arrowHead) + ' ' + trackHeight/2;
    pathStr += ' L ' + x(d.center) + ' ' + parseInt(trackHeight + arrowHeight)/2;
    return pathStr;
  }

  function tickFormatter (d) {
    if ((d / 1000000) >= 1)
      d = d / 1000000 + "M";
    else if ((d / 1000) >= 1)
      d = d / 1000 + "K";
    return d;            
  }

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };
  
  chart.x = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };
    
  chart.xAxis = function(_) {
    if (!arguments.length) return xAxis;
    xAxis = _;
    return chart; 
  };

  chart.yAxis = function(_) {
    if (!arguments.length) return yAxis;
    yAxis = _;
    return chart; 
  };  
  chart.trackHeight = function(_) {
    if (!arguments.length) return trackHeight;
    trackHeight = _;
    return chart;
  };

  chart.utrHeight = function(_) {
    if (!arguments.length) return utrHeight;
    utrHeight = _;
    return chart;
  };

  chart.cdsHeight = function(_) {
    if (!arguments.length) return cdsHeight;
    cdsHeight = _;
    return chart;
  };

  chart.arrowHeight = function(_) {
    if (!arguments.length) return arrowHeight;
    arrowHeight = _;
    return chart;
  };

  return chart;
}