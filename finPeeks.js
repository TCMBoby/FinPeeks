/*
    @license
    Copyright (c) 2019 Tobias Mertz
    This code may only be used under the terms of the BSD 3-Clause license.
*/

class visual
{

    // --------------------------------------------------------------------------------------------
    // INIT
    // --------------------------------------------------------------------------------------------
    
    constructor()
    {
        this.settings = {
            separator: " ",
            saving: 100.0,
            month_offset: 0,
            colors_seq: ["#2171b5", "#6baed6", "#bdd7e7"],
            colors_div: ["#2166ac", "#67a9cf", "#d1e5f0", "#fddbc7", "#ef8a62", "#b2182b"],
            colors_cat: [[],
                ["#2171b5"], // colorblind safe
                ["#2c2c2c", "#2171b5"], // colorblind safe
                ["#2c2c2c", "#2166ac", "#b2182b"], // colorblind safe
                ["#2c2c2c", "#a6cee3", "#1f78b4", "#b2df8a"], // colorblind safe
                ["#2c2c2c", "#a6cee3", "#1f78b4", "#b2df8a", "#33a02c"], // colorblind safe
                ["#2c2c2c", "#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99"], // print safe
                ["#2c2c2c", "#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c"], // print safe
                ["#2c2c2c", "#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f"], // print safe
                ["#2c2c2c", "#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf"], // print safe
                ["#2c2c2c", "#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"], // print safe
                ["#2c2c2c", "#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a"],
                ["#2c2c2c", "#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99"],
                ["#2c2c2c", "#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928"]],
            colors_text: "black",
            colors_background: "#f5f5f5",
            fontFamily: "Ubuntu, Calibri, Arial, sans-serif",
            transitionTime: 250,
            currency: "€",
        };

        this.svgs = {
            cumulativeSpending: d3.select("#cumulativeSpending"),
            cumulativeSaldo: d3.select("#cumulativeSaldo"),
            spendingPerMonth: d3.select("#spendingPerMonth"),
            cumulativeMealSpending: d3.select("#cumulativeMealSpending"),
            cumulativeAmenitySpending: d3.select("#cumulativeAmenitySpending"),
            spendingPerCategory: d3.select("#spendingPerCategory"),
            goodsVServices: d3.select("#goodsVServices"),
            onceVRegular: d3.select("#onceVRegular"),
            necessityVLuxury: d3.select("#necessityVLuxury"),
            topAmount: d3.select("#topAmount"),
            topCount: d3.select("#topCount"),
        };

        this.statusLine = d3.select("#status");

        this.tooltip = d3.select(".tooltip")
            .style("position", "absolute")
            .style("z-index", 1)
            .style("visibility", "hidden")
            .style("width", "auto")
            .style("height", "40px")
            .style("background-color", this.settings.colors_text)
            .style("opacity", 0.7)
            .style("border-radius", "7px")
            .style("pointer-events", "none");

        this.tooltip.append("p")
            .attr("class", "tooltipText");

        this.state = {
            data: [],
            income: [],
            error: false,
            message: "",
        };
    }

    // generates a set of n colors, nearly uniformly distributed over RGB space
    generateColors(n)
    {
        if (n <= 0)
            return ["#000000"];
        if (n <= 13)
            return this.settings.colors_cat[n];

        // generate equidistant range of "cubic root"-many values
        let n3 = Math.cbrt(n);
        let dim = (Math.floor(n3) === n3) ? (Math.ceil(Math.cbrt(n)) + 1) : Math.ceil(Math.cbrt(n));
        let range = [...Array(dim).keys()].map((d) => d * 255 / (dim - 1));

        // generate color values from outer product of range
        let colors = [];
        for (let r = 0; r < range.length; ++r)
        {
            for (let g = 0; g < range.length; ++g)
            {
                for (let b = 0; b < range.length; ++b)
                {
                    // skip white color
                    if ((r === g) && (g === b) && (b === (range.length - 1)))
                        break;
                    colors.push([range[r], range[g], range[b]]);
                }
            }
        }
        
        // shuffle colors
        for (let i = colors.length - 1; i > 0; --i)
        {
            let j = Math.floor(Math.random() * i);
            let tmp = colors[i];
            colors[i] = colors[j];
            colors[j] = tmp;
        }

        // return HEX values for the first n colors
        return colors.slice(0, n).map((d) => d3.rgb(d[0], d[1], d[2]).hex());
    }

    // --------------------------------------------------------------------------------------------
    // DATA PREPARATION
    // --------------------------------------------------------------------------------------------

    parseVisData()
    {
        this.state.vis = {};
        // init arrays
        this.state.vis.spendingPerMonth = {
            total: Array(this.state.months).fill(0),
            meal: Array(this.state.months).fill(0),
        };
        this.state.vis.incomePerMonth = Array(this.state.months).fill(0);
        this.state.vis.cumulativeSaldo = Array(this.state.months).fill(0);
        this.state.vis.cumulativeSpending = {
            "current": Array(32).fill(0),
            "last": Array(32).fill(0),
            "avg": Array(32).fill(0),
        };
        this.state.vis.cumulativeMealSpending = {
            "current": Array(32).fill(0),
            "last": Array(32).fill(0),
            "avg": Array(32).fill(0),
        };
        this.state.vis.cumulativeAmenitySpending = {
            "current": Array(32).fill(0),
            "last": Array(32).fill(0),
            "avg": Array(32).fill(0),
        };
        let spendingPerCategory = {
            "current": Array(this.state.categories.length).fill(0),
            "last": Array(this.state.categories.length).fill(0),
            "avg": Array(this.state.categories.length).fill(0),
        };
        this.state.vis.goodsVServices = [0, 0, 0];
        let goodsVServices = {
            "goods": [0, 0, 0],
            "services": [0, 0, 0],
        };
        this.state.vis.onceVRegular = [0, 0, 0];
        let onceVRegular = {
            "once": [0, 0, 0],
            "regular": [0, 0, 0],
        };
        this.state.vis.necessityVLuxury = [0, 0, 0];
        let necessityVLuxury = {
            "necessity": [0, 0, 0],
            "luxury": [0, 0, 0],
        };
        let topAmount = {
            "current": Array(this.state.products.length).fill(0),
            "last": Array(this.state.products.length).fill(0),
            "avg": Array(this.state.products.length).fill(0),
        };
        let topCount = {
            "current": Array(this.state.products.length).fill(0),
            "last": Array(this.state.products.length).fill(0),
            "avg": Array(this.state.products.length).fill(0),
        };
        
        // fill data arrays
        for (let i = 0; i < this.state.data.length; ++i)
        {
            let d = this.state.data[i];
            let curr = (d.nMonth === (this.state.last.nMonth - this.settings.month_offset));
            let last = (d.nMonth === (this.state.last.nMonth - this.settings.month_offset - 1));
            let key = (curr) ? "current" : (last) ? "last" : "avg";
            let nkey = (curr) ? 0 : (last) ? 1 : 2;

            this.state.vis.spendingPerMonth.total[d.nMonth - this.state.first.nMonth] += d.amount;
            if (d.nl && (d.category === "food"))
                this.state.vis.spendingPerMonth.meal[d.nMonth - this.state.first.nMonth] += d.amount;

            let addToKey = (d, key, nkey) => {
                this.state.vis.cumulativeSpending[key][d.day] += d.amount;
                if (d.nl && (d.category === "food"))
                    this.state.vis.cumulativeMealSpending[key][d.day] += d.amount;
                if (!d.nl && (d.category != "food"))
                    this.state.vis.cumulativeAmenitySpending[key][d.day] += d.amount;
                
                if (d.gs)
                    goodsVServices.goods[nkey] += d.amount;
                else
                    goodsVServices.services[nkey] += d.amount;
                if (d.or)
                    onceVRegular.once[nkey] += d.amount;
                else
                    onceVRegular.regular[nkey] += d.amount;
                if (d.nl)
                    necessityVLuxury.necessity[nkey] += d.amount;
                else
                    necessityVLuxury.luxury[nkey] += d.amount;
                
                for (let j = 0; j < this.state.categories.length; ++j)
                {
                    if  (this.state.categories[j] === d.category)
                        spendingPerCategory[key][j] += d.amount;
                };

                for (let j = 0; j < this.state.products.length; ++j)
                {
                    if (this.state.products[j] === d.product)
                    {
                        topAmount[key][j] += +d.amount;
                        topCount[key][j] += 1;
                    }
                }
            };

            addToKey(d, key, nkey);
            // the last month also accumulated in the past avg
            if (key === "last")
                addToKey(d, "avg", 2);
        }

        // fill income array
        for (let i = 0; i < this.state.income.length; ++i)
        {
            let d = this.state.income[i];
            this.state.vis.incomePerMonth[d.nMonth - this.state.first.nMonth] -= d.amount;
        }

        // fill saldo array
        for (let i = 0; i < this.state.months; ++i)
        {
            this.state.vis.cumulativeSaldo[i] = this.state.vis.incomePerMonth[i] - this.state.vis.spendingPerMonth.total[i];
            if (i)
                this.state.vis.cumulativeSaldo[i] += this.state.vis.cumulativeSaldo[i-1];
        }

        // format data arrays

        // cumulative data
        for (let i = 0; i < 32; ++i)
        {
            if (i)
            {
                // current
                this.state.vis.cumulativeSpending.current[i] += this.state.vis.cumulativeSpending.current[i-1];
                this.state.vis.cumulativeMealSpending.current[i] += this.state.vis.cumulativeMealSpending.current[i-1];
                this.state.vis.cumulativeAmenitySpending.current[i] += this.state.vis.cumulativeAmenitySpending.current[i-1];

                // last
                this.state.vis.cumulativeSpending.last[i] += this.state.vis.cumulativeSpending.last[i-1];
                this.state.vis.cumulativeMealSpending.last[i] += this.state.vis.cumulativeMealSpending.last[i-1];
                this.state.vis.cumulativeAmenitySpending.last[i] += this.state.vis.cumulativeAmenitySpending.last[i-1];
                
                // avg
                if (this.state.months > 1)
                {
                    this.state.vis.cumulativeSpending.avg[i] = this.state.vis.cumulativeSpending.avg[i] / (this.state.months - 1) + this.state.vis.cumulativeSpending.avg[i-1];
                    this.state.vis.cumulativeMealSpending.avg[i] = this.state.vis.cumulativeMealSpending.avg[i] / (this.state.months - 1) + this.state.vis.cumulativeMealSpending.avg[i-1];
                    this.state.vis.cumulativeAmenitySpending.avg[i] = this.state.vis.cumulativeAmenitySpending.avg[i] / (this.state.months - 1) + this.state.vis.cumulativeAmenitySpending.avg[i-1];
                }
            }
            else if (this.state.months > 1)
            {
                this.state.vis.cumulativeSpending.avg[i] = this.state.vis.cumulativeSpending.avg[i] / (this.state.months - 1);
                this.state.vis.cumulativeMealSpending.avg[i] = this.state.vis.cumulativeMealSpending.avg[i] / (this.state.months - 1);
                this.state.vis.cumulativeAmenitySpending.avg[i] = this.state.vis.cumulativeAmenitySpending.avg[i] / (this.state.months - 1);
            }
        }

        // flag-fractioned data
        // current month
        let currentTotal = goodsVServices.goods[0] + goodsVServices.services[0];
        if (currentTotal)
        {
            this.state.vis.goodsVServices[0] = goodsVServices.services[0] * 100 / currentTotal;
            this.state.vis.onceVRegular[0] = onceVRegular.regular[0] * 100 / currentTotal;
            this.state.vis.necessityVLuxury[0] = necessityVLuxury.luxury[0] * 100 / currentTotal;
        }
        
        // last month
        let lastTotal = goodsVServices.goods[1] + goodsVServices.services[1];
        if (lastTotal)
        {
            this.state.vis.goodsVServices[1] = goodsVServices.services[1] * 100 / lastTotal;
            this.state.vis.onceVRegular[1] = onceVRegular.regular[1] * 100 / lastTotal;
            this.state.vis.necessityVLuxury[1] = necessityVLuxury.luxury[1] * 100 / lastTotal;    
        }

        // past months avg
        let avgTotal = goodsVServices.goods[2] + goodsVServices.services[2];
        if ((this.state.months > 1) && avgTotal)
        {
            this.state.vis.goodsVServices[2] = goodsVServices.services[2] * 100 / avgTotal;
            this.state.vis.onceVRegular[2] = onceVRegular.regular[2] * 100 / avgTotal;
            this.state.vis.necessityVLuxury[2] = necessityVLuxury.luxury[2] * 100 / avgTotal;
        }
        
        // per category
        let filterCategories = (d) => {
            let i = 0;
            for (; i < d.length; ++i)
            {
                if (d[i][0] < 1)
                    break;
            }
            return d.slice(0, i);
        }

        // find all categories larger than 1%
        // current
        let currentCategories = this.state.categories
                .map((d, i) => [((currentTotal) ? (spendingPerCategory.current[i] * 100 / currentTotal) : spendingPerCategory.current[i]), d])
                .sort((a, b) => b[0] - a[0]);
        currentCategories = filterCategories(currentCategories);

        // last
        let lastCategories = this.state.categories
            .map((d, i) => [((lastTotal) ? (spendingPerCategory.last[i] * 100 / lastTotal) : spendingPerCategory.last[i]), d])
            .sort((a, b) => b[0] - a[0]);
        lastCategories = filterCategories(lastCategories);

        // avg
        let avgCategories = this.state.categories
            .map((d, i) => [(((this.state.months > 1) && avgTotal) ? (spendingPerCategory.avg[i] * 100 / avgTotal) : spendingPerCategory.avg[i]), d])
            .sort((a, b) => b[0] - a[0]);
        avgCategories = filterCategories(avgCategories);
        
        // accumulate all categories
        this.state.vis.spendingPerCategory = {};
        currentCategories.forEach((d) => {
            if (!Object.keys(this.state.vis.spendingPerCategory).includes(d[1]))
                this.state.vis.spendingPerCategory[d[1]] = [d[0], 0, 0];
        });
        lastCategories.forEach((d) => {
            if (!Object.keys(this.state.vis.spendingPerCategory).includes(d[1]))
                this.state.vis.spendingPerCategory[d[1]] = [0, d[0], 0];
            else
                this.state.vis.spendingPerCategory[d[1]][1] = d[0];
        });
        avgCategories.forEach((d) => {
            if (!Object.keys(this.state.vis.spendingPerCategory).includes(d[1]))
                this.state.vis.spendingPerCategory[d[1]] = [0, 0, d[0]];
            else
                this.state.vis.spendingPerCategory[d[1]][2] = d[0];
        });

        // make category percentages cumulative
        let cats = Object.keys(this.state.vis.spendingPerCategory);
        for (let i = 0; i < cats.length; ++i)
        {
            this.state.vis.spendingPerCategory[cats[i]][0] = [this.state.vis.spendingPerCategory[cats[i]][0], this.state.vis.spendingPerCategory[cats[i]][0]];
            this.state.vis.spendingPerCategory[cats[i]][1] = [this.state.vis.spendingPerCategory[cats[i]][1], this.state.vis.spendingPerCategory[cats[i]][1]];
            this.state.vis.spendingPerCategory[cats[i]][2] = [this.state.vis.spendingPerCategory[cats[i]][2], this.state.vis.spendingPerCategory[cats[i]][2]];
            if (i)
            {
                this.state.vis.spendingPerCategory[cats[i]][0][1] += this.state.vis.spendingPerCategory[cats[i-1]][0][1];
                this.state.vis.spendingPerCategory[cats[i]][1][1] += this.state.vis.spendingPerCategory[cats[i-1]][1][1];
                this.state.vis.spendingPerCategory[cats[i]][2][1] += this.state.vis.spendingPerCategory[cats[i-1]][2][1];
            }
        }

        // products by amount
        this.state.vis.topProductsAmount = {};
        // current
        this.state.vis.topProductsAmount.current = this.state.products
            .map((d, i) => [topAmount.current[i], d])
            .sort((a, b) => b[0] - a[0])
            .slice(0, 5);
        // last
        this.state.vis.topProductsAmount.last = this.state.products
            .map((d, i) => [topAmount.last[i], d])
            .sort((a, b) => b[0] - a[0])
            .slice(0, 5);
        // avg
        this.state.vis.topProductsAmount.avg = this.state.products
            .map((d, i) => [(this.state.months > 1) ? (topAmount.avg[i] / (this.state.months - 1)) : topAmount.avg[i], d])
            .sort((a, b) => b[0] - a[0])
            .slice(0, 5);

        // products by count
        this.state.vis.topProductsCount = {};
        // current
        this.state.vis.topProductsCount.current = this.state.products
            .map((d, i) => [topCount.current[i], d])
            .sort((a, b) => b[0] - a[0])
            .slice(0, 5);
        // last
        this.state.vis.topProductsCount.last = this.state.products
            .map((d, i) => [topCount.last[i], d])
            .sort((a, b) => b[0] - a[0])
            .slice(0, 5);
        // avg
        this.state.vis.topProductsCount.avg = this.state.products
            .map((d, i) => [(topCount.avg[i] / (this.state.months - 1)), d])
            .sort((a, b) => b[0] - a[0])
            .slice(0, 5);

    }

    // --------------------------------------------------------------------------------------------
    // DATA PARSING
    // --------------------------------------------------------------------------------------------
    
    formatData(rawData)
    {
        // convert arrays to objects
        rawData.forEach((d) => {
            if (isNaN(d[0])
             || isNaN(d[1])
             || isNaN(d[2])
             || isNaN(d[3]))
                return;

            if (+d[3] < 0)
            {
                this.state.income.push({
                    day: +d[0],
                    month: +d[1],
                    year: +d[2],
                    amount: +d[3],
                    get date() { return ((this.year * 12) + this.month) * 31 + this.day; },
                    get nMonth() { return (this.year * 12) + this.month; },
                });
            }
            else
            {
                if ((d.length != 9)
                 || ((d[5] != 'g') && (d[5] != 's'))
                 || ((d[6] != 'o') && (d[6] != 'r'))
                 || ((d[7] != 'n') && (d[7] != 'l')))
                    return;

                this.state.data.push({
                    day: +d[0],
                    month: +d[1],
                    year: +d[2],
                    amount: +d[3],
                    product: d[4],
                    gs: (d[5] === 'g'),
                    or: (d[6] === 'o'),
                    nl: (d[7] === 'n'),
                    category: d[8],
                    get date() { return ((this.year * 12) + this.month) * 31 + this.day; },
                    get nMonth() { return (this.year * 12) + this.month; },
                });
            }
        });

        // extract meta info
        this.state.first = {date: Infinity};
        this.state.last = {date: 0};
        this.state.categories = [];
        this.state.products = [];
        this.state.data.forEach((d) => {
            if (d.date < this.state.first.date)
                this.state.first = d;
            if (d.date > this.state.last.date)
                this.state.last = d;

            if (!this.state.categories.includes(d.category))
                this.state.categories.push(d.category);
            if (!this.state.products.includes(d.product))
                this.state.products.push(d.product);
        });
        this.state.income.forEach((d => {
            if (d.date < this.state.first.date)
                this.state.first = d;
            if (d.date > this.state.last.date)
                this.state.last = d;
        }));

        this.state.months = this.state.last.nMonth - this.settings.month_offset - this.state.first.nMonth + 1;
        if (this.state.months <= 0)
        {
            this.state.error = true;
            this.state.message = "Month Offset cannot be as large as the amount of months!";
            return;
        }

        this.parseVisData();
    }

    // --------------------------------------------------------------------------------------------
    // Mouse events
    // --------------------------------------------------------------------------------------------

    // renders a text label at the given position
    barMouseHover(node, data, attributes)
    {
        let position = d3.mouse(node.node());
        let nodePos = [d3.event.pageX - position[0], d3.event.pageY - position[1]];

        if (data.length)
        {
            this.tooltip
                .style("visibility", null)
                .style("left", nodePos[0] + attributes.x + "px")
                .style("top", nodePos[1] + attributes.y - 20 + "px");

            this.tooltip.select(".tooltipText")
                .style("color", this.settings.colors_background)
                .style("margin-top", "10px")
                .style("margin-bottom", "0px")
                .style("margin-right", "5px")
                .style("margin-left", "5px")
                .style("padding", "0px")
                .html(data[0].toFixed(2) + attributes.unit);
        }
        else
            this.tooltip.style("visibility", "hidden");
    }

    // adds an invisible overlay to the visualization, with given event listeners
    addOverlay(node, data, attributes)
    {
        let dataJoin = node.selectAll(".Overlay").data([0]);
        
        dataJoin.enter()
            .append("g")
            .attr("class", "crosshairGroup")
            .attr("shape-rendering", "crispEdges");
        
        dataJoin.enter()
            .append("rect")
            .attr("class", "overlay")
            .attr("x", attributes.xScale.range()[0])
            .attr("y", attributes.yScale.range()[1])
            .attr("width", (attributes.xScale.range()[1] - attributes.xScale.range()[0]))
            .attr("height", (attributes.yScale.range()[0] - attributes.yScale.range()[1]))
            .attr("fill-opacity", 0)
            .on("mouseover", (d, i, list) => (attributes.mouseOver) ? attributes.mouseOver(node, data, attributes) : null)
            .on("mouseout", (d, i, list) => (attributes.mouseOut) ? attributes.mouseOut(node, data, attributes) : null)
            .on("mousemove", (d, i, list) => (attributes.mouseMove) ? attributes.mouseMove(node, data, attributes) : null);

        dataJoin.exit()
            .remove();
    }

    // toggles display of crosshair
    toggleCrosshair(node, data, attributes)
    {
        let position = d3.mouse(node.node());
        let absPosition = [ d3.event.pageX, d3.event.pageY ];

        let dataJoin = node.select(".crosshairGroup").selectAll(".crosshairLine").data((attributes.draw) ? position : []);

        dataJoin.enter()
            .append("line")
            .attr("class", "crosshairLine")
            .attr("stroke", this.settings.colors_text)
            .attr("stroke-width", 1)
            .attr("x1", (d, i) => (i) ? attributes.xScale.range()[0] : d)
            .attr("y1", (d, i) => (i) ? d : attributes.yScale.range()[1])
            .attr("x2", (d, i) => (i) ? attributes.xScale.range()[1] : d)
            .attr("y2", (d, i) => (i) ? d : attributes.yScale.range()[0]);

        dataJoin.exit()
            .remove();

        if (attributes.draw)
        {
            this.tooltip
                .style("visibility", null)
                .style("left", +(absPosition[0] + 4) + "px")
                .style("top", +(absPosition[1] - 44) + "px");
        }
        else
            this.tooltip.style("visibility", "hidden");
    }

    // moves crosshair to position
    renderCrosshair(node, data, attributes)
    {
        let position = d3.mouse(node.node());
        let absPosition = [ d3.event.pageX, d3.event.pageY ];
        
        let dataJoin = node.select(".crosshairGroup").selectAll(".crosshairLine").data(position);

        dataJoin
            .attr("x1", (d, i) => (i) ? attributes.xScale.range()[0] : d)
            .attr("y1", (d, i) => (i) ? d : attributes.yScale.range()[1])
            .attr("x2", (d, i) => (i) ? attributes.xScale.range()[1] : d)
            .attr("y2", (d, i) => (i) ? d : attributes.yScale.range()[0]);

        this.tooltip
            .style("left", +(absPosition[0] + 4) + "px")
            .style("top", +(absPosition[1] - 44) + "px");
    }

    // fills the tooltip with info about the amount per day
    dayTooltipText(node, data, attributes)
    {
        let position = d3.mouse(node.node());

        this.tooltip.select(".tooltipText")
            .style("color", this.settings.colors_background)
            .style("margin-top", "0px")
            .style("margin-bottom", "0px")
            .style("margin-right", "5px")
            .style("margin-left", "5px")
            .style("padding", "0px")
            .html("Day: "
                + Math.floor(attributes.xScale.invert(position[0]))
                + "<br />Amount: "
                + attributes.yScale.invert(position[1]).toFixed(2)
                + this.settings.currency);
    }

    // fills the tooltip with info about the amount per month
    monthTooltipText(node, data, attributes)
    {
        let position = d3.mouse(node.node());

        let date = attributes.xScale.invert(position[0]);

        this.tooltip.select(".tooltipText")
            .style("color", this.settings.colors_background)
            .style("margin-top", "0px")
            .style("margin-bottom", "0px")
            .style("margin-right", "5px")
            .style("margin-left", "5px")
            .style("padding", "0px")
            .html("Month: "
                + +(date.getMonth() + 1) + "-" + date.getFullYear()
                + "<br />Amount: "
                + attributes.yScale.invert(position[1]).toFixed(2)
                + this.settings.currency);
    }

    // --------------------------------------------------------------------------------------------
    // RENDERING - Helpers
    // --------------------------------------------------------------------------------------------

    // renders a heading centered above the visualization
    renderHeading(node, attributes, heading)
    {
        let dataJoin = node.selectAll(".heading").data([0]);

        dataJoin.enter()
            .append("text")
            .attr("class", "heading")
            .attr("fill", this.settings.colors_text)
            .attr("dominant-baseline", "hanging")
            .attr("text-anchor", "middle")
            .attr("font-family", this.settings.fontFamily)
            .attr("font-size", 20)
            .attr("font-weight", 600)
            .attr("x", attributes.width / 2)
            .attr("y", 10)
            .text(heading);

        dataJoin.exit()
            .remove();
    }

    // renders a label below the x-axis
    renderXLabel(node, attributes, label)
    {
        let dataJoin = node.selectAll(".xLabel").data([0]);

        dataJoin.enter()
            .append("text")
            .attr("class", "xLabel")
            .attr("fill", this.settings.colors_text)
            .attr("dominant-baseline", "hanging")
            .attr("text-anchor", "middle")
            .attr("font-family", this.settings.fontFamily)
            .attr("font-size", 16)
            .attr("x", attributes.x)
            .attr("y", attributes.height + 15 - attributes.padding)
            .text(label);

        dataJoin.exit()
            .remove();
    }

    // renders a label to the left of the y-axis
    renderYLabel(node, attributes, label)
    {
        let dataJoin = node.selectAll(".yLabel").data([0]);

        dataJoin.enter()
            .append("text")
            .attr("class", "yLabel")
            .attr("fill", this.settings.colors_text)
            .attr("dominant-baseline", "alphabetic")
            .attr("text-anchor", "middle")
            .attr("font-family", this.settings.fontFamily)
            .attr("font-size", 16)
            .attr("transform", "translate(" + [attributes.padding - 40, attributes.height] + ") rotate(" + -90 + ")")
            .text(label);

        dataJoin.exit()
            .remove();
    }

    // renders the x-axis
    renderXAxis(node, attributes)
    {
        let dataJoin = node.selectAll(".xAxis").data([0]);

        dataJoin.enter()
            .append("g")
            .attr("class", "xAxis")
            .attr("transform", "translate(" + [0, attributes.y] + ")")
            .call(attributes.xAxis);

        dataJoin.exit()
            .remove();
    }

    // renders the y-axis
    renderYAxis(node, attributes)
    {
        let dataJoin = node.selectAll(".yAxis").data([0]);

        dataJoin.enter()
            .append("g")
            .attr("class", "yAxis")
            .attr("transform", "translate(" + [attributes.x, 0] + ")")
            .call(attributes.yAxis);

        dataJoin.exit()
            .remove();
    }

    // renders a legend below the x-axis label
    renderLegend(node, attributes, entries, colors)
    {
        // calculate necessary numbers of rows and columns
        let rows = Math.ceil((entries.length * (attributes.colSize + attributes.colorboxSize + attributes.colorboxPadding * 2)) / attributes.legendWidth);
        let cols = Math.min(Math.floor(attributes.legendWidth / (attributes.colSize + attributes.colorboxSize + attributes.colorboxPadding * 2)), entries.length);
        
        let dataJoin = node.selectAll(".legend").data([0]);

        let dataEnter = dataJoin.enter()
            .append("g")
            .attr("class", "legend")
            .attr("shape-rendering", "crispEdges");

        // legend border
        dataEnter.append("rect")
            .attr("x", Math.floor(attributes.padding))
            .attr("y", Math.floor(attributes.height - 25 * rows - 2))
            .attr("width", Math.ceil(attributes.legendWidth))
            .attr("height", Math.ceil(25 * rows))
            .attr("stroke-width", 1)
            .attr("stroke", "black")
            .attr("fill-opacity", 0);
        
        // legend entries
        for (let i = 0; i < entries.length; ++i)
        {
            let rowId = Math.floor(i / cols);
            let colId = i % cols;

            // color box
            dataEnter.append("rect")
                .attr("x", Math.floor(attributes.padding + attributes.legendWidth * colId / cols + attributes.colorboxPadding))
                .attr("y", Math.floor(attributes.height - 25 * (rows - rowId) + attributes.colorboxPadding))
                .attr("width", Math.ceil(attributes.colorboxSize))
                .attr("height", Math.ceil(attributes.colorboxSize))
                .attr("stroke-width", 1)
                .attr("stroke", "black")
                .attr("fill", colors[i]);

            // label
            dataEnter.append("text")
                .attr("x", Math.floor(attributes.padding + attributes.legendWidth * colId / cols + attributes.colorboxPadding * 2 + attributes.colorboxSize))
                .attr("y", Math.floor(attributes.height - 25 * (rows - rowId) + attributes.colorboxPadding))
                .attr("dominant-baseline", "hanging")
                .attr("text-anchor", "start")
                .attr("font-family", this.settings.fontFamily)
                .attr("font-size", 16)
                .text(entries[i]);
        }

        dataJoin.exit()
            .remove();
    }

    // renders a line-graph
    renderLine(node, data, attributes)
    {
        let dataJoin = node.selectAll("." + attributes.name).data(data);

        // create index array (for optional categorical xScale)
        let xi = [...Array(data.length).keys()];
        if (attributes.xIndex)
            xi = attributes.xIndex;

        let dataEnter = dataJoin.enter()
            .append("line")
            .attr("class", attributes.name)
            .attr("x1", (d, i) => attributes.xScale((i) ? xi[i - 1] : xi[i]))
            .attr("x2", (d, i) => attributes.xScale(xi[i]))
            .attr("y1", attributes.yScale.range()[0])
            .attr("y2", attributes.yScale.range()[0])
            .attr("stroke-width", 2)
            .attr("stroke", attributes.color);

        // animate line
        dataEnter.merge(dataJoin)
            .transition(attributes.t)
            .attr("y1", (d, i) => attributes.yScale(((i) ? data[i-1] : d)))
            .attr("y2", (d, i) => attributes.yScale(d));

        dataJoin.exit()
            .transition(attributes.t)
            .attr("y1", attributes.yScale.range()[0])
            .attr("y2", attributes.yScale.range()[0])
            .remove()
    }

    // renders a stacked bar chart for two categories, summing up to one
    renderDoubleBar(node, data, attributes)
    {
        // upper
        {
            let dataJoin = node.selectAll("." + attributes.name[0]).data(data);

            let dataEnter = dataJoin.enter()
                .append("rect")
                .attr("class", attributes.name[0])
                .attr("x", (d, i) => attributes.xScale(attributes.ticks[i]) + attributes.xScale.bandwidth() / 2 - attributes.barWidth / 2)
                .attr("y", attributes.yScale.range()[1])
                .attr("width", attributes.barWidth)
                .attr("height", 0)
                .attr("fill", attributes.color[0])
                .attr("stroke-width", 0)
                .on("mouseover", (d, i, list) => this.barMouseHover(node, [100 - d], {
                    name: attributes.name[0],
                    x: attributes.xScale(attributes.ticks[i]) + attributes.xScale.bandwidth() / 2 + attributes.barWidth / 2,
                    y: attributes.yScale(d),
                    unit: attributes.unit,
                    baseline: "text-after-edge",
                }))
                .on("mouseout", (d, i, list) => this.barMouseHover(node, [], {
                    name: attributes.name[0],
                    x: attributes.xScale(attributes.ticks[i]) + attributes.xScale.bandwidth() / 2 + attributes.barWidth / 2,
                    y: attributes.yScale(d),
                    unit: attributes.unit,
                    baseline: "text-after-edge",
                }));

            // animate bars
            dataEnter.merge(dataJoin)
                .transition(attributes.t)
                .attr("height", (d, i) => attributes.yScale(d) - attributes.yScale.range()[1]);

            dataJoin.exit()
                .remove();
        }

        // lower
        {
            let dataJoin = node.selectAll("." + attributes.name[1]).data(data);

            let dataEnter = dataJoin.enter()
                .append("rect")
                .attr("class", attributes.name[1])
                .attr("x", (d, i) => attributes.xScale(attributes.ticks[i]) + attributes.xScale.bandwidth() / 2 - attributes.barWidth / 2)
                .attr("y", attributes.yScale.range()[0])
                .attr("width", attributes.barWidth)
                .attr("height", 0)
                .attr("fill", attributes.color[1])
                .attr("stroke-width", 0)
                .on("mouseover", (d, i, list) => this.barMouseHover(node, [d], {
                    name: attributes.name[1],
                    x: attributes.xScale(attributes.ticks[i]) + attributes.xScale.bandwidth() / 2 + attributes.barWidth / 2,
                    y: attributes.yScale(d),
                    unit: attributes.unit,
                    baseline: "text-before-edge",
                }))
                .on("mouseout", (d, i, list) => this.barMouseHover(node, [], {
                    name: attributes.name[1],
                    x: attributes.xScale(attributes.ticks[i]) + attributes.xScale.bandwidth() / 2 + attributes.barWidth / 2,
                    y: attributes.yScale(d),
                    unit: attributes.unit,
                    baseline: "text-before-edge",
                }));

            // animate bars
            dataEnter.merge(dataJoin)
                .transition(attributes.t)
                .attr("y", (d, i) => attributes.yScale(d))
                .attr("height", (d, i) => attributes.yScale.range()[0] - attributes.yScale(d));

            dataJoin.exit()
                .remove();
        }
    }

    // renders three sets of bar charts
    renderTopBars(node, data, attributes)
    {
        // right
        {
            // bars
            let dataJoin = node.selectAll("." + attributes.name[2]).data(data[2]);

            let dataEnter = dataJoin.enter()
                .append("rect")
                .attr("class", attributes.name[2])
                .attr("x", (d, i) => attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 0.5)
                .attr("y", attributes.yScale.range()[0])
                .attr("width", attributes.barWidth)
                .attr("height", 0)
                .attr("fill", attributes.color[2])
                .attr("stroke-width", 0)
                .on("mouseover", (d, i, list) => this.barMouseHover(node, [d[0]], {
                    name: attributes.name[2] + "Value",
                    x: attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 1.5,
                    y: attributes.yScale(d[0]),
                    unit: attributes.unit,
                    baseline: "text-before-edge",
                }))
                .on("mouseout", (d, i, list) => this.barMouseHover(node, [], {
                    name: attributes.name[2] + "Value",
                    x: attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 1.5,
                    y: attributes.yScale(d[0]),
                    unit: attributes.unit,
                    baseline: "text-before-edge",
                }));

            // animate bars
            dataEnter.merge(dataJoin)
                .transition(attributes.t)
                .attr("y", (d, i) => attributes.yScale(d[0]))
                .attr("height", (d, i) => attributes.yScale.range()[0] - attributes.yScale(d[0]));

            dataJoin.exit()
                .remove();

            // text
            let textJoin = node.selectAll("." + attributes.name[2] + "Text").data(data[2]);

            let textEnter = textJoin.enter()
                .append("text")
                .attr("class", attributes.name[2] + "Text")
                .attr("transform", (d, i) => "translate(" + [
                    attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 1,
                    attributes.yScale.range()[0]
                ] + ") rotate(" + -90 + ")")
                .attr("font-family", this.settings.fontFamily)
                .attr("font-size", 16)
                .attr("dominant-baseline", "middle")
                .attr("text-anchor", "start")
                .attr("fill", this.settings.colors_text)
                .attr("fill-opacity", 0)
                .text((d, i) => (d[0]) ? d[1] : "");

            // animate text
            textEnter.merge(textJoin)
                .transition(attributes.t)
                .attr("transform", (d, i) => "translate(" + [
                    attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 1,
                    attributes.yScale(d[0])
                ] + ") rotate(" + -90 + ")")
                .attr("fill-opacity", 1);

            textJoin.exit()
                .remove();
        }

        // middle
        {
            // bars
            let dataJoin = node.selectAll("." + attributes.name[1]).data(data[1]);

            let dataEnter = dataJoin.enter()
                .append("rect")
                .attr("class", attributes.name[1])
                .attr("x", (d, i) => attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 - attributes.barWidth * 0.5)
                .attr("y", attributes.yScale.range()[0])
                .attr("width", attributes.barWidth)
                .attr("height", 0)
                .attr("fill", attributes.color[1])
                .attr("stroke-width", 0)
                .on("mouseover", (d, i, list) => this.barMouseHover(node, [d[0]], {
                    name: attributes.name[1] + "Value",
                    x: attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 0.5,
                    y: attributes.yScale(d[0]),
                    unit: attributes.unit,
                    baseline: "text-before-edge",
                }))
                .on("mouseout", (d, i, list) => this.barMouseHover(node, [], {
                    name: attributes.name[1] + "Value",
                    x: attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 0.5,
                    y: attributes.yScale(d[0]),
                    unit: attributes.unit,
                    baseline: "text-before-edge",
                }));

            // animate bars
            dataEnter.merge(dataJoin)
                .transition(attributes.t)
                .attr("y", (d, i) => attributes.yScale(d[0]))
                .attr("height", (d, i) => attributes.yScale.range()[0] - attributes.yScale(d[0]));

            dataJoin.exit()
                .remove();

            // text
            let textJoin = node.selectAll("." + attributes.name[1] + "Text").data(data[1]);

            let textEnter = textJoin.enter()
                .append("text")
                .attr("class", attributes.name[1] + "Text")
                .attr("transform", (d, i) => "translate(" + [
                    attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 0,
                    attributes.yScale.range()[0]
                ] + ") rotate(" + -90 + ")")
                .attr("font-family", this.settings.fontFamily)
                .attr("font-size", 16)
                .attr("dominant-baseline", "middle")
                .attr("text-anchor", "start")
                .attr("fill", this.settings.colors_text)
                .attr("fill-opacity", 0)
                .text((d, i) => (d[0]) ? d[1] : "");

            // animate text
            textEnter.merge(textJoin)
                .transition(attributes.t)
                .attr("transform", (d, i) => "translate(" + [
                    attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 + attributes.barWidth * 0,
                    attributes.yScale(d[0])
                ] + ") rotate(" + -90 + ")")
                .attr("fill-opacity", 1);

            textJoin.exit()
                .remove();
        }

        // left
        {
            // bars
            let dataJoin = node.selectAll("." + attributes.name[0]).data(data[0]);

            let dataEnter = dataJoin.enter()
                .append("rect")
                .attr("class", attributes.name[0])
                .attr("x", (d, i) => attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 - attributes.barWidth * 1.5)
                .attr("y", attributes.yScale.range()[0])
                .attr("width", attributes.barWidth)
                .attr("height", 0)
                .attr("fill", attributes.color[0])
                .attr("stroke-width", 0)
                .on("mouseover", (d, i, list) => this.barMouseHover(node, [d[0]], {
                    name: attributes.name[0] + "Value",
                    x: attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 - attributes.barWidth * 0.5,
                    y: attributes.yScale(d[0]),
                    unit: attributes.unit,
                    baseline: "text-before-edge",
                }))
                .on("mouseout", (d, i, list) => this.barMouseHover(node, [], {
                    name: attributes.name[0] + "Value",
                    x: attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 - attributes.barWidth * 0.5,
                    y: attributes.yScale(d[0]),
                    unit: attributes.unit,
                    baseline: "text-before-edge",
                }));

            // animate bars
            dataEnter.merge(dataJoin)
                .transition(attributes.t)
                .attr("y", (d, i) => attributes.yScale(d[0]))
                .attr("height", (d, i) => attributes.yScale.range()[0] - attributes.yScale(d[0]));

            dataJoin.exit()
                .remove();

            // text
            let textJoin = node.selectAll("." + attributes.name[0] + "Text").data(data[0]);

            let textEnter = textJoin.enter()
                .append("text")
                .attr("class", attributes.name[0] + "Text")
                .attr("transform", (d, i) => "translate(" + [
                    attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 - attributes.barWidth * 1,
                    attributes.yScale.range()[0]
                ] + ") rotate(" + -90 + ")")
                .attr("font-family", this.settings.fontFamily)
                .attr("font-size", 16)
                .attr("dominant-baseline", "middle")
                .attr("text-anchor", "start")
                .attr("fill", this.settings.colors_text)
                .attr("fill-opacity", 0)
                .text((d, i) => (d[0]) ? d[1] : "");

            // animate text
            textEnter.merge(textJoin)
                .transition(attributes.t)
                .attr("transform", (d, i) => "translate(" + [
                    attributes.xScale(i + 1) + attributes.xScale.bandwidth() / 2 - attributes.barWidth * 1,
                    attributes.yScale(d[0])
                ] + ") rotate(" + -90 + ")")
                .attr("fill-opacity", 1);

            textJoin.exit()
                .remove();
        }
    }

    // --------------------------------------------------------------------------------------------
    // RENDERING - Mains
    // --------------------------------------------------------------------------------------------
    
    // main rendering function for the cumulative spending visualization
    renderCumulativeSpending()
    {
        // set parameters
        let svg = this.svgs.cumulativeSpending;
        if (svg.empty())
            return;

        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 100,
            right: 30,
            top: 50,
            bottom: 75,
        }

        let income = (this.state.months > 1) ? this.state.vis.incomePerMonth[this.state.months - 2] : 0;
        let budget = (income) ? (income - this.settings.saving) : 0;
        let t = d3.transition().duration(this.settings.transitionTime);
        let maxval = Math.max(d3.max(this.state.vis.cumulativeSpending.current), d3.max(this.state.vis.cumulativeSpending.last), d3.max(this.state.vis.cumulativeSpending.avg), income) * 1.1;

        // create scales
        let xScale = d3.scaleLinear()
            .domain([0, 31])
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);

        let yScale = d3.scaleLinear()
            .domain([0, maxval])
            .rangeRound([height - padding.bottom, padding.top])
            .nice();
        let yAxis = d3.axisLeft(yScale).ticks(5);

        // income
        if (income)
        {
            let dataJoin = svg.selectAll(".income").data([0]);

            dataJoin.enter()
                .append("rect")
                .attr("class", "income")
                .attr("x", xScale.range()[0])
                .attr("y", yScale.range()[1])
                .attr("width", xScale.range()[1] - xScale.range()[0])
                .attr("height", yScale(income) - yScale.range()[1])
                .attr("fill", this.settings.colors_div[4])
                .attr("stroke-width", 0);

            dataJoin.exit()
                .remove();
        }

        // budget
        if (income)
        {
            let dataJoin = svg.selectAll(".budget").data([0]);

            dataJoin.enter()
                .append("rect")
                .attr("class", "budget")
                .attr("x", xScale.range()[0])
                .attr("y", yScale(income))
                .attr("width", xScale.range()[1] - xScale.range()[0])
                .attr("height", yScale(budget) - yScale(income))
                .attr("fill", this.settings.colors_div[3])
                .attr("stroke-width", 0);

            dataJoin.exit()
                .remove();
        }

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = [
                "Current Month (" + this.state.vis.cumulativeSpending.current[31].toFixed(2) + this.settings.currency + ")",
                "Last Month (" + this.state.vis.cumulativeSpending.last[31].toFixed(2) + this.settings.currency + ")",
                "Past Months Avg (" + this.state.vis.cumulativeSpending.avg[31].toFixed(2) + this.settings.currency + ")"
            ];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[1], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }

        // axes
        this.renderHeading(svg, {width: width}, "Cumulative Spending per Day");
        this.renderXLabel(svg, {x: (xScale.range()[0] + xScale.range()[1]) / 2, height: height, padding: padding.bottom}, "Day of the Month");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Expenditure [" + this.settings.currency + "]");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // avg
        this.renderLine(svg, this.state.vis.cumulativeSpending.avg, {
            name: "avgLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_div[2],
            t: t,
        });

        // last
        this.renderLine(svg, this.state.vis.cumulativeSpending.last, {
            name: "lastLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_div[1],
            t: t,
        });

        // current
        this.renderLine(svg, this.state.vis.cumulativeSpending.current, {
            name: "currentLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_div[0],
            t: t,
        });

        // mouse over tooltip overlay
        this.addOverlay(svg, this.state.vis.cumulativeSpending, {
            xScale: xScale,
            yScale: yScale,
            mouseOver: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: true}) },
            mouseOut: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: false}) },
            mouseMove: (node, data, attributes) => {
                this.renderCrosshair(node, data, attributes);
                this.dayTooltipText(node, data, attributes);
            },
        });
    }

    // main rendering function for the cumulative saldo visualization
    renderCumulativeSaldo()
    {
        // set parameters
        let svg = this.svgs.cumulativeSaldo;
        if (svg.empty())
            return;

        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 100,
            right: 30,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);
        let maxval = d3.max(this.state.vis.cumulativeSaldo) * 1.1;
        let minval = Math.min(d3.min(this.state.vis.cumulativeSaldo), 0) * 1.1;

        // create month array
        let timeParse = d3.timeParse("%m-%Y");
        let dates = [...Array(this.state.months).keys()]
            .map((d) => d + this.state.first.nMonth)
            .map((d) => [Math.floor(d / 12), d % 12])
            .map((d) => timeParse(d[1] + "-" + d[0]));

        // create scales
        let xScale = d3.scaleTime()
            .domain([dates[0], dates[dates.length - 1]])
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat("%b-%Y"));

        let yScale = d3.scaleLinear()
            .domain([minval, maxval])
            .rangeRound([height - padding.bottom, padding.top])
            .nice();
        let yAxis = d3.axisLeft(yScale).ticks(5);

        // axes
        this.renderHeading(svg, {width: width}, "Cumulative Saldo");
        this.renderXLabel(svg, {x: (xScale.range()[0] + xScale.range()[1]) / 2, height: height, padding: padding.bottom}, "Month");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Saldo [" + this.settings.currency + "]");
        this.renderXAxis(svg, {y: yScale(0), xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // line
        // this.renderLine(svg, this.state.vis.cumulativeSaldo, {
        //     name: "saldoLine",
        //     xIndex: dates,
        //     xScale: xScale,
        //     yScale: yScale,
        //     color: this.settings.colors_seq[0],
        //     t: t,
        // });

        let dataJoin = svg.selectAll(".saldoLine").data(this.state.vis.cumulativeSaldo);
        let dataEnter = dataJoin.enter()
            .append("line")
            .attr("class", "saldoLine")
            .attr("x1", (d, i) => xScale((i) ? dates[i - 1] : dates[i]))
            .attr("x2", (d, i) => xScale(dates[i]))
            .attr("y1", yScale.range()[0])
            .attr("y2", yScale.range()[0])
            .attr("stroke-width", 2)
            .attr("stroke", (d, i) => {
                if (i && (this.state.vis.cumulativeSaldo[i-1] > d))
                    return this.settings.colors_div[5];
                else
                    return this.settings.colors_div[0];
            });
        // animate line
        dataEnter.merge(dataJoin)
            .transition(t)
            .attr("y1", (d, i) => yScale(((i) ? this.state.vis.cumulativeSaldo[i-1] : d)))
            .attr("y2", (d, i) => yScale(d));
        dataJoin.exit()
            .transition(t)
            .attr("y1", yScale.range()[0])
            .attr("y2", yScale.range()[0])
            .remove()

        // mouse over tooltip overlay
        this.addOverlay(svg, this.state.vis.cumulativeSaldo, {
            xScale: xScale,
            yScale: yScale,
            mouseOver: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: true}) },
            mouseOut: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: false}) },
            mouseMove: (node, data, attributes) => {
                this.renderCrosshair(node, data, attributes);
                this.monthTooltipText(node, data, attributes);
            },
        });
    }
    
    // main rendering function for the spending per month visualization
    renderSpendingPerMonth()
    {
        // set parameters
        let svg = this.svgs.spendingPerMonth;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 100,
            right: 30,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);
        let maxval = Math.max(d3.max(this.state.vis.spendingPerMonth.meal), d3.max(this.state.vis.spendingPerMonth.total));
        
        // create month array
        let timeParse = d3.timeParse("%m-%Y");
        let dates = [...Array(this.state.months).keys()]
            .map((d) => d + this.state.first.nMonth)
            .map((d) => [Math.floor(d / 12), d % 12])
            .map((d) => timeParse(d[1] + "-" + d[0]));

        // create scales
        let xScale = d3.scaleTime()
            .domain([dates[0], dates[dates.length - 1]])
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat("%b-%Y"));

        let yScale = d3.scaleLinear()
            .domain([0, maxval])
            .rangeRound([height - padding.bottom, padding.top])
            .nice();
        let yAxis = d3.axisLeft(yScale).ticks(5);

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = ["Total", "Meals"];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }

        // axes
        this.renderHeading(svg, {width: width}, "Expenditure per Month");
        this.renderXLabel(svg, {x: (xScale.range()[0] + xScale.range()[1]) / 2, height: height, padding: padding.bottom}, "Month");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Expenditure [" + this.settings.currency + "]");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // meals
        this.renderLine(svg, this.state.vis.spendingPerMonth.meal, {
            name: "mealLine",
            xIndex: dates,
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_seq[2],
            t: t,
        });
        
        // total
        this.renderLine(svg, this.state.vis.spendingPerMonth.total, {
            name: "totalLine",
            xIndex: dates,
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_seq[0],
            t: t,
        });

        // mouse over tooltip overlay
        this.addOverlay(svg, this.state.vis.cumulativeSpending, {
            xScale: xScale,
            yScale: yScale,
            mouseOver: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: true}) },
            mouseOut: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: false}) },
            mouseMove: (node, data, attributes) => {
                this.renderCrosshair(node, data, attributes);
                this.monthTooltipText(node, data, attributes);
            },
        });
    }

    // main rendering function for the cumulative meal spending visualization
    renderCumulativeMealSpending()
    {
        // set parameters
        let svg = this.svgs.cumulativeMealSpending;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 50,
            right: 100,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);
        let maxval = Math.max(d3.max(this.state.vis.cumulativeMealSpending.current), d3.max(this.state.vis.cumulativeMealSpending.last), d3.max(this.state.vis.cumulativeMealSpending.avg)) * 1.1;

        // create scales
        let xScale = d3.scaleLinear()
            .domain([0, 31])
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);

        let yScale = d3.scaleLinear()
            .domain([0, maxval])
            .rangeRound([height - padding.bottom, padding.top])
            .nice();
        let yAxis = d3.axisLeft(yScale).ticks(5);

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = [
                "Current Month (" + this.state.vis.cumulativeMealSpending.current[31].toFixed(2) + this.settings.currency + ")",
                "Last Month (" + this.state.vis.cumulativeMealSpending.last[31].toFixed(2) + this.settings.currency + ")",
                "Past Months Avg (" + this.state.vis.cumulativeMealSpending.avg[31].toFixed(2) + this.settings.currency + ")"
            ];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[1], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }

        // axes
        this.renderHeading(svg, {width: width}, "Cumulative Meal Spending per Day");
        this.renderXLabel(svg, {x: (xScale.range()[0] + xScale.range()[1]) / 2, height: height, padding: padding.bottom}, "Day of the Month");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Expenditure [" + this.settings.currency + "]");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // avg
        this.renderLine(svg, this.state.vis.cumulativeMealSpending.avg, {
            name: "avgLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_seq[2],
            t: t,
        });

        // last
        this.renderLine(svg, this.state.vis.cumulativeMealSpending.last, {
            name: "lastLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_seq[1],
            t: t,
        });

        // current
        this.renderLine(svg, this.state.vis.cumulativeMealSpending.current, {
            name: "currentLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_seq[0],
            t: t,
        });

        // mouse over tooltip overlay
        this.addOverlay(svg, this.state.vis.cumulativeSpending, {
            xScale: xScale,
            yScale: yScale,
            mouseOver: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: true}) },
            mouseOut: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: false}) },
            mouseMove: (node, data, attributes) => {
                this.renderCrosshair(node, data, attributes);
                this.dayTooltipText(node, data, attributes);
            },
        });
    }

    // main rendering function for the cumulative amenity spending visualization
    renderCumulativeAmenitySpending()
    {
        // set parameters
        let svg = this.svgs.cumulativeAmenitySpending;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 50,
            right: 100,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);
        let maxval = Math.max(d3.max(this.state.vis.cumulativeAmenitySpending.current), d3.max(this.state.vis.cumulativeAmenitySpending.last), d3.max(this.state.vis.cumulativeAmenitySpending.avg)) * 1.1;

        // create scales
        let xScale = d3.scaleLinear()
            .domain([0, 31])
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);

        let yScale = d3.scaleLinear()
            .domain([0, maxval])
            .rangeRound([height - padding.bottom, padding.top])
            .nice();
        let yAxis = d3.axisLeft(yScale).ticks(5);

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = [
                "Current Month (" + this.state.vis.cumulativeAmenitySpending.current[31].toFixed(2) + this.settings.currency + ")",
                "Last Month (" + this.state.vis.cumulativeAmenitySpending.last[31].toFixed(2) + this.settings.currency + ")",
                "Past Months Avg (" + this.state.vis.cumulativeAmenitySpending.avg[31].toFixed(2) + this.settings.currency + ")"
            ];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[1], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }

        // axes
        this.renderHeading(svg, {width: width}, "Cumulative Amenity Spending per Day");
        this.renderXLabel(svg, {x: (xScale.range()[0] + xScale.range()[1]) / 2, height: height, padding: padding.bottom}, "Day of the Month");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Expenditure [" + this.settings.currency + "]");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // avg
        this.renderLine(svg, this.state.vis.cumulativeAmenitySpending.avg, {
            name: "avgLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_seq[2],
            t: t,
        });

        // last
        this.renderLine(svg, this.state.vis.cumulativeAmenitySpending.last, {
            name: "lastLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_seq[1],
            t: t,
        });

        // current
        this.renderLine(svg, this.state.vis.cumulativeAmenitySpending.current, {
            name: "currentLine",
            xScale: xScale,
            yScale: yScale,
            color: this.settings.colors_seq[0],
            t: t,
        });

        // mouse over tooltip overlay
        this.addOverlay(svg, this.state.vis.cumulativeSpending, {
            xScale: xScale,
            yScale: yScale,
            mouseOver: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: true}) },
            mouseOut: (node, data, attributes) => { this.toggleCrosshair(node, data, {...attributes, draw: false}) },
            mouseMove: (node, data, attributes) => {
                this.renderCrosshair(node, data, attributes);
                this.dayTooltipText(node, data, attributes);
            },
        });
    }

    // main rendering function for the spending per category visualization
    renderSpendingPerCategory()
    {
        // set parameters
        let svg = this.svgs.spendingPerCategory;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 50,
            right: 100,
            top: 50,
            bottom: 105,
        }
        let t = d3.transition().duration(this.settings.transitionTime);
        
        // create utility arrays
        let cats = Object.keys(this.state.vis.spendingPerCategory);
        let colors = (cats.length < this.settings.colors_cat.length)
            ? this.settings.colors_cat[cats.length]
            : this.generateColors(cats.length);
        let ticks = ["Current Month", "Last Month", "Past Months Avg"];

        // create scales
        let xScale = d3.scaleBand()
            .domain(ticks)
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);
        
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .rangeRound([height - padding.bottom, padding.top]);
        let yAxis = d3.axisLeft(yScale).ticks(10);

        let barWidth = xScale.bandwidth() / 5;

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 100,
            };
            let entries = cats;
            this.renderLegend(svg, attributes, entries, colors);
        }

        // axes
        this.renderHeading(svg, {width: width}, "Spending per Category");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Percentage of Expenditure");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // render stacked bar chart
        for (let j = 0; j < cats.length; ++j)
        {
            let data = this.state.vis.spendingPerCategory[cats[j]];
            let dataJoin = svg.selectAll("." + cats[j]).data(data);

            let dataEnter = dataJoin.enter()
                .append("rect")
                .attr("class", cats[j])
                .attr("x", (d, i) => xScale(ticks[i]) + xScale.bandwidth() / 2 - barWidth / 2)
                .attr("y", yScale.range()[0])
                .attr("width", barWidth)
                .attr("height", 0)
                .attr("fill", colors[j])
                .attr("stroke-width", 0)
                .on("mouseover", (d, i, list) => this.barMouseHover(svg, [d[0]], {
                    name: cats[j],
                    x: xScale(ticks[i]) + xScale.bandwidth() / 2 + barWidth * 0.5,
                    y: (yScale(d[1]) + yScale((j) ? this.state.vis.spendingPerCategory[cats[j-1]][i][1] : 0)) / 2,
                    unit: "%",
                    baseline: "middle",
                }))
                .on("mouseout", (d, i, list) => this.barMouseHover(svg, [], {
                    name: cats[j],
                    x: xScale(ticks[i]) + xScale.bandwidth() / 2 + barWidth * 0.5,
                    y: (yScale(d[1]) + yScale((j) ? this.state.vis.spendingPerCategory[cats[j-1]][i][1] : 0)) / 2,
                    unit: "%",
                    baseline: "middle",
                }));

            // animate bars
            dataEnter.merge(dataJoin)
                .transition(t)
                .attr("y", (d, i) => yScale(d[1]))
                .attr("height", (d, i) => yScale((j) ? this.state.vis.spendingPerCategory[cats[j-1]][i][1] : 0) - yScale(d[1]));

            dataJoin.exit()
                .remove();
        }

    }

    // main rendering function for the goods vs. services visualization
    renderGoodsVServices()
    {
        // set parameters
        let svg = this.svgs.goodsVServices;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 50,
            right: 100,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);

        // create utility array
        let ticks = ["Current Month", "Last Month", "Past Months Avg"];

        // create scales
        let xScale = d3.scaleBand()
            .domain(ticks)
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);
        
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .rangeRound([height - padding.bottom, padding.top]);
        let yAxis = d3.axisLeft(yScale).ticks(5);
        
        let barWidth = xScale.bandwidth() / 5;

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = ["Goods", "Services"];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }

        // axes
        this.renderHeading(svg, {width: width}, "Goods VS Services");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Percentage of Expenditure");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // bars
        this.renderDoubleBar(svg, this.state.vis.goodsVServices, {
            name: ["goods", "services"],
            unit: "%",
            ticks: ticks,
            color: [this.settings.colors_seq[0], this.settings.colors_seq[2]],
            xScale: xScale,
            yScale: yScale,
            barWidth: barWidth,
            t: t,
        });
    }

    // main rendering function for the once vs. regular visualization
    renderOnceVRegular()
    {
        // set parameters
        let svg = this.svgs.onceVRegular;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 100,
            right: 30,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);

        // create utility array
        let ticks = ["Current Month", "Last Month", "Past Months Avg"];

        // create scales
        let xScale = d3.scaleBand()
            .domain(ticks)
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);
        
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .rangeRound([height - padding.bottom, padding.top]);
        let yAxis = d3.axisLeft(yScale).ticks(5);

        let barWidth = xScale.bandwidth() / 5;

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = ["Once", "Regular"];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }
        
        // axes
        this.renderHeading(svg, {width: width}, "Once VS Regular");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Percentage of Expenditure");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // bars
        this.renderDoubleBar(svg, this.state.vis.onceVRegular, {
            name: ["once", "regular"],
            unit: "%",
            ticks: ticks,
            color: [this.settings.colors_seq[0], this.settings.colors_seq[2]],
            xScale: xScale,
            yScale: yScale,
            barWidth: barWidth,
            t: t,
        });
    }

    // main rendering function for the necessity vs. luxury visualization
    renderNecessityVLuxury()
    {
        // set parameters
        let svg = this.svgs.necessityVLuxury;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 50,
            right: 100,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);

        // create utility array
        let ticks = ["Current Month", "Last Month", "Past Months Avg"];

        // create scales
        let xScale = d3.scaleBand()
            .domain(ticks)
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);
        
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .rangeRound([height - padding.bottom, padding.top]);
        let yAxis = d3.axisLeft(yScale).ticks(5);

        let barWidth = xScale.bandwidth() / 5;

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = ["Necessity", "Luxury"];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }
        
        // exes
        this.renderHeading(svg, {width: width}, "Necessity VS Luxury");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Percentage of Expenditure");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // bars
        this.renderDoubleBar(svg, this.state.vis.necessityVLuxury, {
            name: ["necessity", "luxury"],
            unit: "%",
            ticks: ticks,
            color: [this.settings.colors_seq[0], this.settings.colors_seq[2]],
            xScale: xScale,
            yScale: yScale,
            barWidth: barWidth,
            t: t,
        });
    }

    // main rendering function for the top products by amount visualization
    renderTopAmount()
    {
        // set parameters
        let svg = this.svgs.topAmount;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 100,
            right: 30,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);
        let maxval = Math.max(this.state.vis.topProductsAmount.current[0][0], this.state.vis.topProductsAmount.last[0][0], this.state.vis.topProductsAmount.avg[0][0]) * 1.2;

        // create scales
        let xScale = d3.scaleBand()
            .domain([1, 2, 3, 4, 5])
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);
        
        let yScale = d3.scaleLinear()
            .domain([0, maxval])
            .rangeRound([height - padding.bottom, padding.top])
            .nice();
        let yAxis = d3.axisLeft(yScale).ticks(5);
        
        let barWidth = xScale.bandwidth() / 4.5;
        
        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = ["Current Month", "Last Month", "Past Months Avg"];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[1], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }
        
        // axes
        this.renderHeading(svg, {width: width}, "Top Products By Expenditure");
        this.renderXLabel(svg, {x: (xScale.range()[0] + xScale.range()[1]) / 2, height: height, padding: padding.bottom}, "Placement");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Expenditure [" + this.settings.currency + "]");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // bars
        this.renderTopBars(svg, [
            this.state.vis.topProductsAmount.current,
            this.state.vis.topProductsAmount.last,
            this.state.vis.topProductsAmount.avg
        ], {
            name: ["currentBar", "lastBar", "avgBar"],
            unit: this.settings.currency,
            color: [this.settings.colors_seq[0], this.settings.colors_seq[1], this.settings.colors_seq[2]],
            xScale: xScale,
            yScale: yScale,
            barWidth: barWidth,
            t: t,
        });
    }

    // main rendering function for the top products by count visualization
    renderTopCount()
    {
        // set parameters
        let svg = this.svgs.topCount;
        if (svg.empty())
            return;
        
        let width = svg.node().getBoundingClientRect().width;
        let height = svg.node().getBoundingClientRect().height;
        let padding = {
            left: 100,
            right: 30,
            top: 50,
            bottom: 75,
        }
        let t = d3.transition().duration(this.settings.transitionTime);
        let maxval = Math.max(this.state.vis.topProductsCount.current[0][0], this.state.vis.topProductsCount.last[0][0], this.state.vis.topProductsCount.avg[0][0]) * 1.2;

        // create scales
        let xScale = d3.scaleBand()
            .domain([1, 2, 3, 4, 5])
            .rangeRound([padding.left, width - padding.right]);
        let xAxis = d3.axisBottom(xScale);
        
        let yScale = d3.scaleLinear()
            .domain([0, maxval])
            .rangeRound([height - padding.bottom, padding.top])
            .nice();
        let yAxis = d3.axisLeft(yScale).ticks(5);

        let barWidth = xScale.bandwidth() / 4.5;

        // legend
        {
            let attributes = {
                legendWidth: width - padding.left - padding.right,
                colorboxSize: 16,
                colorboxPadding: 3,
                height: height,
                padding: padding.left,
                colSize: 200,
            };
            let entries = ["Current Month", "Last Month", "Past Months Avg"];
            let colors = [this.settings.colors_seq[0], this.settings.colors_seq[1], this.settings.colors_seq[2]];
            this.renderLegend(svg, attributes, entries, colors);
        }
        
        // axes
        this.renderHeading(svg, {width: width}, "Top Products By Count");
        this.renderXLabel(svg, {x: (xScale.range()[0] + xScale.range()[1]) / 2, height: height, padding: padding.bottom}, "Placement");
        this.renderYLabel(svg, {padding: padding.left, height: (yScale.range()[0] + yScale.range()[1]) / 2}, "Nr. of Purchases");
        this.renderXAxis(svg, {y: yScale.range()[0], xAxis: xAxis});
        this.renderYAxis(svg, {x: xScale.range()[0], yAxis: yAxis});

        // bars
        this.renderTopBars(svg, [
            this.state.vis.topProductsCount.current,
            this.state.vis.topProductsCount.last,
            this.state.vis.topProductsCount.avg
        ], {
            name: ["currentBar", "lastBar", "avgBar"],
            unit: "",
            color: [this.settings.colors_seq[0], this.settings.colors_seq[1], this.settings.colors_seq[2]],
            xScale: xScale,
            yScale: yScale,
            barWidth: barWidth,
            t: t,
        });
    }

    // main rendering function, calls the other rendering functions
    render()
    {
        if (!this.state.error)
        {
            this.statusLine.text("Recorded from " + this.state.first.day + "." + this.state.first.month + "." + this.state.first.year + " to " + this.state.last.day + "." + this.state.last.month + "." + this.state.last.year);
            this.renderCumulativeSpending();
            this.renderCumulativeSaldo();
            this.renderSpendingPerMonth();
            this.renderCumulativeMealSpending();
            this.renderCumulativeAmenitySpending();
            this.renderSpendingPerCategory();
            this.renderGoodsVServices();
            this.renderOnceVRegular();
            this.renderNecessityVLuxury();
            this.renderTopAmount();
            this.renderTopCount();
        }
        else
        {
            this.statusLine.text("ERROR: " + this.state.message);
        }
    }
}

// --------------------------------------------------------------------------------------------
// LOADING
// --------------------------------------------------------------------------------------------

let vis = new visual();

function handleFileSelect(evt) {
    let file = evt.target.files[0];
    let reader = new FileReader();

    reader.onloadstart = (d) => {
        vis.statusLine.text("Loading...");
    };

    reader.onloadend = (evt) => {
        if (evt.target.readyState == FileReader.DONE) {
            let d = evt.target.result;
            // csv parsing and array conversion
            let dsv = d3.dsvFormat(vis.settings.separator);
            let rawData = dsv.parseRows(d);
            // data processing
            vis.formatData(rawData);
            // visualization
            vis.render();
        }
    };

    reader.readAsText(file);
}

document.getElementById("inputButton").addEventListener("change", handleFileSelect, false);
