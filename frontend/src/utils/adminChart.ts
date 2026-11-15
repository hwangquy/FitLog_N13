export function buildAdminChartAxis(maxValue:number):{max:number;ticks:number[]} {
 const max=Math.max(1,Math.ceil(maxValue));
 const step=Math.max(1,Math.ceil(max/4));
 const axisMax=Math.ceil(max/step)*step;
 const ticks:number[]=[];
 for(let tick=0;tick<=axisMax;tick+=step)ticks.push(tick);
 return {max:axisMax,ticks};
}
