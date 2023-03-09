
import css from "./style.css";

import * as d3 from 'd3';



// http://using-d3js.com/06_03_treemaps.html


// Define global variables
const WIDTH = 1366;
const HEIGHT = 768;
const LEGEND_LENGTH = 300;






let data = {}


const state = {
    paletteIndex: 0,
    palettesArr: [],
    scales: {}
};

const svgWrapper = d3.select('#svg-wrapper')
 




fetch(
    "https://cdn.freecodecamp.org/testable-projects-fcc/data/tree_map/video-game-sales-data.json",
    { method: "GET", header: "Content-Type: application/json" }
)
    .then(res => res.json())
    .then(parsedJson => {
        let hierarchy = d3.hierarchy(parsedJson); 
        
        hierarchy.sum(d => d.hasOwnProperty("value") ? d.value : 0);
        hierarchy.sort((a, b) => b.height - a.height || b.value - a.value);
        let treemapFunc = d3.treemap().size([WIDTH,HEIGHT]).padding(5);
        treemapFunc(hierarchy);
        console.log(hierarchy);


        svgWrapper
        .selectAll('rect')
        .data(hierarchy.descendants())
        .enter()
        .append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .style('fill', d => "#" + (16777215 % Math.round((d.x1 - d.x0) * (d.y1 - d.y0))).toString(16))


    })
  




function buildScales(educationData) {
    state.palettesArr = [
        {
            name: "ColorBrewer's 9-class BuGn Sequential",
            colors: [
                '#f7fcfd',
                '#e5f5f9',
                '#ccece6',
                '#99d8c9',
                '#66c2a4',
                '#41ae76',
                '#238b45',
                '#006d2c',
                '#00441b'
            ].map(element => d3.color(element))
        }
    ]


    let extent = d3.extent(educationData, element => element.bachelorsOrHigher)
    

    state.scales.eduToColor = d3.scaleQuantize()
        .domain([0, extent[1]])
        .range(state.palettesArr[state.paletteIndex].colors)

    state.scales.eduToLegendPosition = d3.scaleLinear()
        .domain([0, extent[1]])
        .range([0, LEGEND_LENGTH])

}

function buildLegend(data) {
    let colorScaleRange = state.palettesArr[state.paletteIndex].colors;
    let colorExtentsForLegend = colorScaleRange.map((color, index) => {
        return state.scales.eduToColor.invertExtent(color);
    });

    let tickValues = colorExtentsForLegend.map(element => element[1]);
    tickValues.unshift(0);
    let legendAxis = d3.axisBottom(state.scales.eduToLegendPosition)
        .tickValues(tickValues)


    let legend = svgWrapper.append('g')
        .attr('id', 'legend')
        .attr('style', `transform: translate(${565}px,
                ${50}px);`
        )
        .call(legendAxis)

    legend.selectAll('text')
        .text(function () {
            return this.innerHTML + '%';
        })


    let rectHeight = 20;
    let rectWidth = state.scales.eduToLegendPosition(colorExtentsForLegend[0][1]);
    legend
        .selectAll('rect')
        .data(colorExtentsForLegend)
        .enter()
        .append('rect')
        .attr('x', d => state.scales.eduToLegendPosition(d[0]))
        .attr('y', - rectHeight)
        .attr('height', rectHeight)
        .attr('width', rectWidth)
        .attr('fill', d => state.scales.eduToColor(d[0]))

}

function buildClasses() {
    class Tooltip {

        textElementQuantity = 0;
        textObj = {};
        tooltipTimeoutId = null;



        constructor(config) {
            this.container = config.container;
            this.containerWidth = config.containerWidth;
            this.containerHeight = config.containerHeight;
            this.paddingHorizontal = config.paddingHorizontal ? config.paddingHorizontal : 5;
            this.paddingVertical = config.paddingVertical ? config.paddingVertical : 5;
            this.timeoutDurationInMs = config.timeoutDurationInMs ? config.timeoutDurationInMs : 1000;

            this.tooltip = this.container
                .append('g')
                .attr('id', 'tooltip')


            this.tooltipRect = this.tooltip.append('rect')
                .attr('rx', '.75%')
                .attr('ry', '.75%')
                // Setting these attributes to 0 so that NaN doesn't have to be parsed
                // later 
                .attr('width', 0)
                .attr('height', 0);

        }





        addTextElement(id) {
            let paddingVerticalEms = this.paddingVertical / this.#pixelsPerEm();
            let yOffset = (this.textElementQuantity === 0) ? 0 : (2 * this.textElementQuantity);;



            let textElement = this.tooltip.append('text')
                .attr('id', id)
                // dy: 1em; effectively shifts origin of text from bottom left to top left
                .attr('dy', '1em')
                .attr('y', paddingVerticalEms + yOffset + 'em')


            // height of rect is set to include all textElements + a vert padding

            this.tooltipRect
                .attr('height', (yOffset + 1 + 2 * paddingVerticalEms) + 'em');



            this.textObj[id] = {};
            this.textObj[id].text = null;
            this.textObj[id].length = null;


            this.textElementQuantity++;
            this.textObj[id].index = this.textElementQuantity - 1;



            return textElement;
        }

        setTextElement(id, textValue) {
            if (this.textObj[id] === undefined) {
                this.addTextElement(id);
            }


            this.textObj[id].text = textValue;
            let textElement = this.tooltip.select('#' + id)
                .text(textValue);

            // Dynamically resize tooltip rect based on text length
            let rectWidth = parseFloat(this.tooltipRect.attr('width'));
            let textElementWidth = textElement.node().getComputedTextLength();


            this.textObj[id].length = textElementWidth;

            let lengthArr = [];
            for (const textId in this.textObj) {
                let length = this.textObj[textId].length
                lengthArr.push(length);
            }
            let maxLength = d3.max(lengthArr);

            if (maxLength > rectWidth || maxLength < rectWidth) {
                this.tooltipRect.attr('width', maxLength + 2 * this.paddingHorizontal);
                rectWidth = maxLength + 2 * this.paddingHorizontal;
            }

            // Horizontally center all textElements
            for (const textId in this.textObj) {
                let length = this.textObj[textId].length
                let textStartX = (rectWidth - length) / 2;
                this.tooltip.select('#' + textId).attr('x', textStartX)
            }


        }

        setPos(x, y, isHorizontallyCenteredOnPoint = false) {
            this.timeoutId ? clearTimeout(this.timeoutId) : null;

            // Handle horizontally centering 
            let leftSideX;
            let topSideY;
            if (isHorizontallyCenteredOnPoint === false) {
                leftSideX = x;
                topSideY = y;
            } else if (isHorizontallyCenteredOnPoint === true) {
                leftSideX = x - parseFloat(this.tooltipRect.attr('width') / 2);
                topSideY = y;
            }

            

            // Reposition if overflow would happen
            let rightSideX = leftSideX + parseFloat(this.tooltipRect.attr('width'));

            let rectHeightInPixels = parseFloat(this.tooltipRect.attr('height')) * this.#pixelsPerEm();
            let bottomSideY = topSideY + rectHeightInPixels;


            if (leftSideX < 0) {
                leftSideX = 0;
            } else if (rightSideX > this.containerWidth) {
                leftSideX = this.containerWidth - this.tooltipRect.attr('width');
            }
            let containerHeight = this.containerHeight;

            if (topSideY < 0) {
                topSideY = 0;
            } else if (bottomSideY > this.containerHeight) {
                topSideY = this.containerHeight - rectHeightInPixels;
            }



            this.tooltip
                .attr('style', `transform: translate(${leftSideX}px, ${topSideY}px)`)




        }

        getTooltip() {
            return this.tooltip;
        }

        doOnDisappear(func) {
            if (this.onDisappear) {
                this.onDisappear.push(func);
            } else {
                this.onDisappear = [];
                this.onDisappear.push(func);
            }
        }

        startDisappearTimer() {
            this.timeoutId = setTimeout(() => {
                this.disappear();
                this.onDisappear ? this.onDisappear.forEach((element) => {
                    element();
                }) : null;
            }, this.timeoutDurationInMs);
        }

        disappear() {
            this.tooltip
                .attr('style', 'visibility: hidden');
        }

        #pixelsPerEm() {
            return parseFloat(getComputedStyle(this.tooltipRect.node().parentNode).fontSize);
        }

    }

    return Tooltip
}


// Debug object

let debug = {
    drawBBox: function (container, element) {
        let rect = element.node().getBBox();
            
        container.append('rect')
            .attr('x', rect.x)
            .attr('y', rect.y)
            .attr('width', rect.width)
            .attr('height', rect.height)
    }
}
