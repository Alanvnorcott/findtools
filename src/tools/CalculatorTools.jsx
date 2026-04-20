import { useMemo, useState } from "react";
import { ActionRow, KeyValueList, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";

function toNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function currency(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value || 0);
}

function number(value, digits = 2) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value || 0);
}

function percent(value, digits = 2) {
  return `${number(value, digits)}%`;
}

function calcResult(main, breakdown) {
  return { main, breakdown };
}

function CalculatorTool({ tool, instructions, fields, result, reset, extra, ...shellProps }) {
  tool.copyValue = () =>
    [result.main, ...result.breakdown.map((item) => `${item.label}: ${item.value}`)].filter(Boolean).join("\n");

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions={instructions}
      inputArea={
        <>
          {fields}
          <ActionRow>
            <button className="button button--secondary" onClick={reset} type="button">
              Reset
            </button>
          </ActionRow>
        </>
      }
      outputArea={
        <ResultPanel title="Result">
          <div className="stack-sm">
            <pre>{result.main}</pre>
            {result.breakdown.length ? <KeyValueList items={result.breakdown} /> : null}
          </div>
        </ResultPanel>
      }
      extra={extra}
    />
  );
}

function pair(a, b) {
  return (
    <div className="split-fields">
      {a}
      {b}
    </div>
  );
}

function triple(a, b, c) {
  return (
    <div className="split-fields">
      {a}
      {b}
      {c}
    </div>
  );
}

export function PercentageCalculatorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("400");
  const [pct, setPct] = useState("15");
  const result = useMemo(() => {
    const amount = toNumber(value);
    const rate = toNumber(pct);
    const output = (amount * rate) / 100;
    return calcResult(`${pct}% of ${value} = ${number(output)}`, [
      { label: "Value", value: number(amount) },
      { label: "Percent", value: percent(rate) },
      { label: "Result", value: number(output) }
    ]);
  }, [pct, value]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Find a percentage of a number."
      fields={pair(
        <ToolInput key="value" label="Value"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>,
        <ToolInput key="pct" label="Percent"><input value={pct} onChange={(e) => setPct(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setValue("400");
        setPct("15");
      }}
    />
  );
}

export function PercentageChangeCalculatorTool({ tool, ...shellProps }) {
  const [start, setStart] = useState("120");
  const [end, setEnd] = useState("156");
  const result = useMemo(() => {
    const a = toNumber(start);
    const b = toNumber(end);
    const change = a === 0 ? 0 : ((b - a) / a) * 100;
    return calcResult(`${change >= 0 ? "Increase" : "Decrease"}: ${percent(change)}`, [
      { label: "Start", value: number(a) },
      { label: "End", value: number(b) },
      { label: "Difference", value: number(b - a) },
      { label: "Change", value: percent(change) }
    ]);
  }, [end, start]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Measure percentage increase or decrease between two values."
      fields={pair(
        <ToolInput key="start" label="Starting value"><input value={start} onChange={(e) => setStart(e.target.value)} /></ToolInput>,
        <ToolInput key="end" label="Ending value"><input value={end} onChange={(e) => setEnd(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setStart("120");
        setEnd("156");
      }}
    />
  );
}

export function CompoundInterestCalculatorTool({ tool, ...shellProps }) {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [compounds, setCompounds] = useState("12");
  const [years, setYears] = useState("10");
  const result = useMemo(() => {
    const p = toNumber(principal);
    const r = toNumber(rate) / 100;
    const n = toNumber(compounds) || 1;
    const t = toNumber(years);
    const total = p * (1 + r / n) ** (n * t);
    return calcResult(`Future value: ${currency(total)}`, [
      { label: "Principal", value: currency(p) },
      { label: "Rate", value: percent(r * 100) },
      { label: "Compounds / year", value: String(n) },
      { label: "Years", value: String(t) },
      { label: "Interest earned", value: currency(total - p) }
    ]);
  }, [compounds, principal, rate, years]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Use A = P(1 + r/n)^(nt) to estimate compound growth."
      fields={
        <>
          {pair(
            <ToolInput key="p" label="Principal"><input value={principal} onChange={(e) => setPrincipal(e.target.value)} /></ToolInput>,
            <ToolInput key="r" label="Annual rate %"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>
          )}
          {pair(
            <ToolInput key="n" label="Compounds per year"><input value={compounds} onChange={(e) => setCompounds(e.target.value)} /></ToolInput>,
            <ToolInput key="t" label="Years"><input value={years} onChange={(e) => setYears(e.target.value)} /></ToolInput>
          )}
        </>
      }
      result={result}
      reset={() => {
        setPrincipal("10000");
        setRate("5");
        setCompounds("12");
        setYears("10");
      }}
    />
  );
}

export function SavingsGrowthCalculatorTool({ tool, ...shellProps }) {
  const [principal, setPrincipal] = useState("5000");
  const [contribution, setContribution] = useState("200");
  const [years, setYears] = useState("5");
  const [rate, setRate] = useState("5");
  const [mode, setMode] = useState("compound");
  const result = useMemo(() => {
    const p = toNumber(principal);
    const pmt = toNumber(contribution);
    const t = toNumber(years);
    const r = toNumber(rate) / 100;
    const total =
      mode === "simple" ? p + pmt * t : p * (1 + r) ** t + (r === 0 ? pmt * t : pmt * (((1 + r) ** t - 1) / r));
    return calcResult(`Projected savings: ${currency(total)}`, [
      { label: "Starting amount", value: currency(p) },
      { label: "Contribution / year", value: currency(pmt) },
      { label: "Years", value: String(t) },
      { label: "Mode", value: mode === "simple" ? "No compounding" : "Compounding" }
    ]);
  }, [contribution, mode, principal, rate, years]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Estimate savings growth with simple or compounded annual growth."
      fields={
        <>
          <ToolInput label="Growth mode">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="compound">With compounding</option>
              <option value="simple">No compounding</option>
            </select>
          </ToolInput>
          {pair(
            <ToolInput key="principal" label="Starting amount"><input value={principal} onChange={(e) => setPrincipal(e.target.value)} /></ToolInput>,
            <ToolInput key="contrib" label="Contribution per year"><input value={contribution} onChange={(e) => setContribution(e.target.value)} /></ToolInput>
          )}
          {pair(
            <ToolInput key="years" label="Years"><input value={years} onChange={(e) => setYears(e.target.value)} /></ToolInput>,
            <ToolInput key="rate" label="Annual rate %"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>
          )}
        </>
      }
      result={result}
      reset={() => {
        setPrincipal("5000");
        setContribution("200");
        setYears("5");
        setRate("5");
        setMode("compound");
      }}
    />
  );
}

export function DiscountCalculatorTool({ tool, ...shellProps }) {
  const [original, setOriginal] = useState("120");
  const [discount, setDiscount] = useState("20");
  const result = useMemo(() => {
    const price = toNumber(original);
    const rate = toNumber(discount) / 100;
    const finalPrice = price * (1 - rate);
    const savings = price - finalPrice;
    return calcResult(`Final price: ${currency(finalPrice)}`, [
      { label: "Original", value: currency(price) },
      { label: "Discount", value: percent(rate * 100) },
      { label: "Savings", value: currency(savings) }
    ]);
  }, [discount, original]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate the discounted price and total savings."
      fields={pair(
        <ToolInput key="price" label="Original price"><input value={original} onChange={(e) => setOriginal(e.target.value)} /></ToolInput>,
        <ToolInput key="discount" label="Discount %"><input value={discount} onChange={(e) => setDiscount(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setOriginal("120");
        setDiscount("20");
      }}
    />
  );
}

export function MarkupCalculatorTool({ tool, ...shellProps }) {
  const [cost, setCost] = useState("40");
  const [markup, setMarkup] = useState("35");
  const result = useMemo(() => {
    const base = toNumber(cost);
    const rate = toNumber(markup) / 100;
    const price = base * (1 + rate);
    return calcResult(`Selling price: ${currency(price)}`, [
      { label: "Cost", value: currency(base) },
      { label: "Markup", value: percent(rate * 100) },
      { label: "Profit", value: currency(price - base) }
    ]);
  }, [cost, markup]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate selling price from a base cost and markup percentage."
      fields={pair(
        <ToolInput key="cost" label="Cost"><input value={cost} onChange={(e) => setCost(e.target.value)} /></ToolInput>,
        <ToolInput key="markup" label="Markup %"><input value={markup} onChange={(e) => setMarkup(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setCost("40");
        setMarkup("35");
      }}
    />
  );
}

export function BreakEvenCalculatorTool({ tool, ...shellProps }) {
  const [fixed, setFixed] = useState("12000");
  const [price, setPrice] = useState("45");
  const [variable, setVariable] = useState("18");
  const result = useMemo(() => {
    const f = toNumber(fixed);
    const p = toNumber(price);
    const v = toNumber(variable);
    const units = p - v === 0 ? 0 : f / (p - v);
    return calcResult(`Break-even units: ${number(units)}`, [
      { label: "Fixed costs", value: currency(f) },
      { label: "Price per unit", value: currency(p) },
      { label: "Variable cost", value: currency(v) },
      { label: "Contribution margin", value: currency(p - v) }
    ]);
  }, [fixed, price, variable]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate the number of units needed to break even."
      fields={triple(
        <ToolInput key="fixed" label="Fixed costs"><input value={fixed} onChange={(e) => setFixed(e.target.value)} /></ToolInput>,
        <ToolInput key="price" label="Price per unit"><input value={price} onChange={(e) => setPrice(e.target.value)} /></ToolInput>,
        <ToolInput key="variable" label="Variable cost per unit"><input value={variable} onChange={(e) => setVariable(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setFixed("12000");
        setPrice("45");
        setVariable("18");
      }}
    />
  );
}

export function LoanVsLeaseCalculatorTool({ tool, ...shellProps }) {
  const [principal, setPrincipal] = useState("28000");
  const [apr, setApr] = useState("6.4");
  const [months, setMonths] = useState("60");
  const [leaseMonthly, setLeaseMonthly] = useState("420");
  const [leaseFees, setLeaseFees] = useState("1800");
  const result = useMemo(() => {
    const p = toNumber(principal);
    const r = toNumber(apr) / 100 / 12;
    const n = toNumber(months);
    const monthly = r === 0 ? p / n : (p * (r * (1 + r) ** n)) / ((1 + r) ** n - 1);
    const loanTotal = monthly * n;
    const leaseTotal = toNumber(leaseMonthly) * n + toNumber(leaseFees);
    return calcResult(loanTotal <= leaseTotal ? "Loan costs less overall." : "Lease costs less overall.", [
      { label: "Loan monthly payment", value: currency(monthly) },
      { label: "Loan total", value: currency(loanTotal) },
      { label: "Lease total", value: currency(leaseTotal) },
      { label: "Difference", value: currency(Math.abs(loanTotal - leaseTotal)) }
    ]);
  }, [apr, leaseFees, leaseMonthly, months, principal]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Compare loan total cost against lease total cost over the same term."
      fields={
        <>
          {triple(
            <ToolInput key="principal" label="Loan principal"><input value={principal} onChange={(e) => setPrincipal(e.target.value)} /></ToolInput>,
            <ToolInput key="apr" label="Loan APR %"><input value={apr} onChange={(e) => setApr(e.target.value)} /></ToolInput>,
            <ToolInput key="months" label="Months"><input value={months} onChange={(e) => setMonths(e.target.value)} /></ToolInput>
          )}
          {pair(
            <ToolInput key="leaseMonthly" label="Lease monthly"><input value={leaseMonthly} onChange={(e) => setLeaseMonthly(e.target.value)} /></ToolInput>,
            <ToolInput key="leaseFees" label="Lease fees"><input value={leaseFees} onChange={(e) => setLeaseFees(e.target.value)} /></ToolInput>
          )}
        </>
      }
      result={result}
      reset={() => {
        setPrincipal("28000");
        setApr("6.4");
        setMonths("60");
        setLeaseMonthly("420");
        setLeaseFees("1800");
      }}
    />
  );
}

export function SubscriptionCostCalculatorTool({ tool, ...shellProps }) {
  const [monthly, setMonthly] = useState("19");
  const [yearly, setYearly] = useState("180");
  const result = useMemo(() => {
    const m = toNumber(monthly);
    const y = toNumber(yearly);
    return calcResult(`Yearly plan saves ${currency(m * 12 - y)}`, [
      { label: "Monthly annualized", value: currency(m * 12) },
      { label: "Yearly total", value: currency(y) },
      { label: "Yearly monthly equivalent", value: currency(y / 12) }
    ]);
  }, [monthly, yearly]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Compare monthly and yearly subscription pricing."
      fields={pair(
        <ToolInput key="monthly" label="Monthly price"><input value={monthly} onChange={(e) => setMonthly(e.target.value)} /></ToolInput>,
        <ToolInput key="yearly" label="Yearly price"><input value={yearly} onChange={(e) => setYearly(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setMonthly("19");
        setYearly("180");
      }}
    />
  );
}

export function FuelCostCalculatorTool({ tool, ...shellProps }) {
  const [distance, setDistance] = useState("240");
  const [mpg, setMpg] = useState("28");
  const [price, setPrice] = useState("3.75");
  const result = useMemo(() => {
    const gallons = toNumber(distance) / (toNumber(mpg) || 1);
    const total = gallons * toNumber(price);
    return calcResult(`Fuel cost: ${currency(total)}`, [
      { label: "Distance", value: `${number(toNumber(distance), 1)} miles` },
      { label: "Fuel used", value: `${number(gallons, 2)} gallons` },
      { label: "Price / gallon", value: currency(toNumber(price)) }
    ]);
  }, [distance, mpg, price]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Estimate trip fuel cost from distance, MPG, and fuel price."
      fields={triple(
        <ToolInput key="distance" label="Distance"><input value={distance} onChange={(e) => setDistance(e.target.value)} /></ToolInput>,
        <ToolInput key="mpg" label="MPG"><input value={mpg} onChange={(e) => setMpg(e.target.value)} /></ToolInput>,
        <ToolInput key="price" label="Price per gallon"><input value={price} onChange={(e) => setPrice(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setDistance("240");
        setMpg("28");
        setPrice("3.75");
      }}
    />
  );
}

export function ElectricityCostCalculatorTool({ tool, ...shellProps }) {
  const [watts, setWatts] = useState("1200");
  const [hours, setHours] = useState("3");
  const [rate, setRate] = useState("0.17");
  const result = useMemo(() => {
    const kwh = (toNumber(watts) * toNumber(hours)) / 1000;
    const total = kwh * toNumber(rate);
    return calcResult(`Electricity cost: ${currency(total)}`, [
      { label: "kWh used", value: number(kwh, 3) },
      { label: "Rate", value: currency(toNumber(rate)) },
      { label: "Hours", value: number(toNumber(hours), 1) }
    ]);
  }, [hours, rate, watts]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate electricity cost from watts, hours, and utility rate."
      fields={triple(
        <ToolInput key="watts" label="Watts"><input value={watts} onChange={(e) => setWatts(e.target.value)} /></ToolInput>,
        <ToolInput key="hours" label="Hours"><input value={hours} onChange={(e) => setHours(e.target.value)} /></ToolInput>,
        <ToolInput key="rate" label="Rate per kWh"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setWatts("1200");
        setHours("3");
        setRate("0.17");
      }}
    />
  );
}

export function CalorieNeedsCalculatorTool({ tool, ...shellProps }) {
  const [sex, setSex] = useState("men");
  const [weight, setWeight] = useState("82");
  const [height, setHeight] = useState("178");
  const [age, setAge] = useState("32");
  const [activity, setActivity] = useState("1.55");
  const result = useMemo(() => {
    const w = toNumber(weight);
    const h = toNumber(height);
    const a = toNumber(age);
    const bmr = sex === "men" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    const calories = bmr * toNumber(activity);
    return calcResult(`Estimated daily calories: ${number(calories, 0)}`, [
      { label: "BMR", value: number(bmr, 0) },
      { label: "Activity multiplier", value: activity },
      { label: "Weight", value: `${w} kg` },
      { label: "Height", value: `${h} cm` }
    ]);
  }, [activity, age, height, sex, weight]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Estimate maintenance calories using the Mifflin-St Jeor formula."
      fields={
        <>
          <ToolInput label="Sex">
            <select value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="men">Men</option>
              <option value="women">Women</option>
            </select>
          </ToolInput>
          {triple(
            <ToolInput key="weight" label="Weight (kg)"><input value={weight} onChange={(e) => setWeight(e.target.value)} /></ToolInput>,
            <ToolInput key="height" label="Height (cm)"><input value={height} onChange={(e) => setHeight(e.target.value)} /></ToolInput>,
            <ToolInput key="age" label="Age"><input value={age} onChange={(e) => setAge(e.target.value)} /></ToolInput>
          )}
          <ToolInput label="Activity multiplier">
            <select value={activity} onChange={(e) => setActivity(e.target.value)}>
              <option value="1.2">Sedentary</option>
              <option value="1.375">Light</option>
              <option value="1.55">Moderate</option>
              <option value="1.725">Very active</option>
            </select>
          </ToolInput>
        </>
      }
      result={result}
      reset={() => {
        setSex("men");
        setWeight("82");
        setHeight("178");
        setAge("32");
        setActivity("1.55");
      }}
    />
  );
}

export function BmiCalculatorTool({ tool, ...shellProps }) {
  const [weight, setWeight] = useState("82");
  const [height, setHeight] = useState("178");
  const result = useMemo(() => {
    const kg = toNumber(weight);
    const meters = toNumber(height) / 100;
    const bmi = kg / ((meters || 1) * (meters || 1));
    return calcResult(`BMI: ${number(bmi, 1)}`, [
      { label: "Weight", value: `${kg} kg` },
      { label: "Height", value: `${toNumber(height)} cm` }
    ]);
  }, [height, weight]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate body mass index from metric height and weight."
      fields={pair(
        <ToolInput key="weight" label="Weight (kg)"><input value={weight} onChange={(e) => setWeight(e.target.value)} /></ToolInput>,
        <ToolInput key="height" label="Height (cm)"><input value={height} onChange={(e) => setHeight(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setWeight("82");
        setHeight("178");
      }}
    />
  );
}

export function WaterIntakeCalculatorTool({ tool, ...shellProps }) {
  const [weight, setWeight] = useState("180");
  const result = useMemo(() => {
    const intake = toNumber(weight) * 0.5;
    return calcResult(`Daily water target: ${number(intake, 0)} oz`, [
      { label: "Weight", value: `${toNumber(weight)} lb` },
      { label: "Rule used", value: "weight × 0.5" }
    ]);
  }, [weight]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Estimate daily water intake using a simple bodyweight rule."
      fields={<ToolInput label="Weight (lb)"><input value={weight} onChange={(e) => setWeight(e.target.value)} /></ToolInput>}
      result={result}
      reset={() => setWeight("180")}
    />
  );
}

export function MacroSplitCalculatorTool({ tool, ...shellProps }) {
  const [calories, setCalories] = useState("2400");
  const [protein, setProtein] = useState("30");
  const [carbs, setCarbs] = useState("40");
  const [fat, setFat] = useState("30");
  const result = useMemo(() => {
    const cals = toNumber(calories);
    const p = (cals * toNumber(protein)) / 100 / 4;
    const c = (cals * toNumber(carbs)) / 100 / 4;
    const f = (cals * toNumber(fat)) / 100 / 9;
    return calcResult("Macro breakdown", [
      { label: "Protein", value: `${number(p, 0)} g` },
      { label: "Carbs", value: `${number(c, 0)} g` },
      { label: "Fat", value: `${number(f, 0)} g` }
    ]);
  }, [calories, carbs, fat, protein]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Split calories into grams of protein, carbs, and fat."
      fields={
        <>
          <ToolInput label="Calories"><input value={calories} onChange={(e) => setCalories(e.target.value)} /></ToolInput>
          {triple(
            <ToolInput key="protein" label="Protein %"><input value={protein} onChange={(e) => setProtein(e.target.value)} /></ToolInput>,
            <ToolInput key="carbs" label="Carbs %"><input value={carbs} onChange={(e) => setCarbs(e.target.value)} /></ToolInput>,
            <ToolInput key="fat" label="Fat %"><input value={fat} onChange={(e) => setFat(e.target.value)} /></ToolInput>
          )}
        </>
      }
      result={result}
      reset={() => {
        setCalories("2400");
        setProtein("30");
        setCarbs("40");
        setFat("30");
      }}
    />
  );
}

export function TimeDifferenceCalculatorTool({ tool, ...shellProps }) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:30");
  const result = useMemo(() => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diff = eh * 60 + em - (sh * 60 + sm);
    if (diff < 0) diff += 1440;
    return calcResult(`${Math.floor(diff / 60)} hours ${diff % 60} minutes`, [
      { label: "Total minutes", value: String(diff) }
    ]);
  }, [end, start]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate the difference between two clock times."
      fields={pair(
        <ToolInput key="start" label="Start time"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></ToolInput>,
        <ToolInput key="end" label="End time"><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setStart("09:00");
        setEnd("17:30");
      }}
    />
  );
}

export function TimeDurationCalculatorTool({ tool, ...shellProps }) {
  const [baseHours, setBaseHours] = useState("2");
  const [baseMinutes, setBaseMinutes] = useState("30");
  const [otherHours, setOtherHours] = useState("1");
  const [otherMinutes, setOtherMinutes] = useState("15");
  const [mode, setMode] = useState("add");
  const result = useMemo(() => {
    const base = toNumber(baseHours) * 60 + toNumber(baseMinutes);
    const other = toNumber(otherHours) * 60 + toNumber(otherMinutes);
    const total = mode === "add" ? base + other : base - other;
    const sign = total < 0 ? "-" : "";
    const abs = Math.abs(total);
    return calcResult(`${sign}${Math.floor(abs / 60)}h ${abs % 60}m`, [
      { label: "Total minutes", value: String(total) }
    ]);
  }, [baseHours, baseMinutes, mode, otherHours, otherMinutes]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Add or subtract one duration from another."
      fields={
        <>
          <ToolInput label="Mode">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
            </select>
          </ToolInput>
          {pair(
            <ToolInput key="baseh" label="Base hours"><input value={baseHours} onChange={(e) => setBaseHours(e.target.value)} /></ToolInput>,
            <ToolInput key="basem" label="Base minutes"><input value={baseMinutes} onChange={(e) => setBaseMinutes(e.target.value)} /></ToolInput>
          )}
          {pair(
            <ToolInput key="otherh" label="Other hours"><input value={otherHours} onChange={(e) => setOtherHours(e.target.value)} /></ToolInput>,
            <ToolInput key="otherm" label="Other minutes"><input value={otherMinutes} onChange={(e) => setOtherMinutes(e.target.value)} /></ToolInput>
          )}
        </>
      }
      result={result}
      reset={() => {
        setBaseHours("2");
        setBaseMinutes("30");
        setOtherHours("1");
        setOtherMinutes("15");
        setMode("add");
      }}
    />
  );
}

export function DaysBetweenDatesCalculatorTool({ tool, ...shellProps }) {
  const [from, setFrom] = useState("2026-04-01");
  const [to, setTo] = useState("2026-04-17");
  const result = useMemo(() => {
    const diff = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24);
    return calcResult(`Days between: ${number(diff, 0)}`, [
      { label: "From", value: from },
      { label: "To", value: to }
    ]);
  }, [from, to]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate the day count between two dates."
      fields={pair(
        <ToolInput key="from" label="Start date"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></ToolInput>,
        <ToolInput key="to" label="End date"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setFrom("2026-04-01");
        setTo("2026-04-17");
      }}
    />
  );
}

export function AgeCalculatorTool({ tool, ...shellProps }) {
  const [birthDate, setBirthDate] = useState("1994-05-16");
  const result = useMemo(() => {
    const today = new Date();
    const birth = new Date(birthDate);
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return calcResult(`${years} years, ${months} months, ${days} days`, [{ label: "Birth date", value: birthDate }]);
  }, [birthDate]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate age from a date of birth using your current local date."
      fields={<ToolInput label="Date of birth"><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></ToolInput>}
      result={result}
      reset={() => setBirthDate("1994-05-16")}
    />
  );
}

export function WorkHoursCalculatorTool({ tool, ...shellProps }) {
  const [rows, setRows] = useState("09:00-12:00\n13:00-17:30");
  const result = useMemo(() => {
    const total = rows
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce((sum, line) => {
        const [start, end] = line.split("-");
        if (!start || !end) return sum;
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        return sum + (eh * 60 + em - (sh * 60 + sm));
      }, 0);
    return calcResult(`${Math.floor(total / 60)} hours ${total % 60} minutes`, [
      { label: "Entries", value: String(rows.split(/\r?\n/).filter(Boolean).length) },
      { label: "Total minutes", value: String(total) }
    ]);
  }, [rows]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Add multiple clock-in and clock-out ranges, one per line."
      fields={<ToolInput label="Time ranges" hint="Use one range per line, like 09:00-12:00"><textarea rows="10" value={rows} onChange={(e) => setRows(e.target.value)} /></ToolInput>}
      result={result}
      reset={() => setRows("09:00-12:00\n13:00-17:30")}
    />
  );
}

export function OvertimePayCalculatorTool({ tool, ...shellProps }) {
  const [hours, setHours] = useState("46");
  const [rate, setRate] = useState("32");
  const [multiplier, setMultiplier] = useState("1.5");
  const result = useMemo(() => {
    const h = toNumber(hours);
    const base = Math.min(h, 40);
    const overtime = Math.max(h - 40, 0);
    const regularPay = base * toNumber(rate);
    const overtimePay = overtime * toNumber(rate) * toNumber(multiplier);
    return calcResult(`Total pay: ${currency(regularPay + overtimePay)}`, [
      { label: "Regular pay", value: currency(regularPay) },
      { label: "Overtime pay", value: currency(overtimePay) },
      { label: "Overtime hours", value: number(overtime, 1) }
    ]);
  }, [hours, multiplier, rate]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate regular and overtime pay with a custom multiplier."
      fields={triple(
        <ToolInput key="hours" label="Hours worked"><input value={hours} onChange={(e) => setHours(e.target.value)} /></ToolInput>,
        <ToolInput key="rate" label="Hourly rate"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>,
        <ToolInput key="multiplier" label="Overtime multiplier"><input value={multiplier} onChange={(e) => setMultiplier(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setHours("46");
        setRate("32");
        setMultiplier("1.5");
      }}
    />
  );
}

export function FreelanceProjectRateCalculatorTool({ tool, ...shellProps }) {
  const [hourly, setHourly] = useState("85");
  const [hours, setHours] = useState("24");
  const [buffer, setBuffer] = useState("15");
  const result = useMemo(() => {
    const base = toNumber(hourly) * toNumber(hours);
    const final = base * (1 + toNumber(buffer) / 100);
    return calcResult(`Recommended project price: ${currency(final)}`, [
      { label: "Base project price", value: currency(base) },
      { label: "Buffer", value: percent(toNumber(buffer)) }
    ]);
  }, [buffer, hourly, hours]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Convert hourly pricing into a fixed project estimate with optional buffer."
      fields={triple(
        <ToolInput key="hourly" label="Hourly rate"><input value={hourly} onChange={(e) => setHourly(e.target.value)} /></ToolInput>,
        <ToolInput key="hours" label="Estimated hours"><input value={hours} onChange={(e) => setHours(e.target.value)} /></ToolInput>,
        <ToolInput key="buffer" label="Buffer %"><input value={buffer} onChange={(e) => setBuffer(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setHourly("85");
        setHours("24");
        setBuffer("15");
      }}
    />
  );
}

export function RoiCalculatorTool({ tool, ...shellProps }) {
  const [gain, setGain] = useState("15000");
  const [cost, setCost] = useState("10000");
  const result = useMemo(() => {
    const g = toNumber(gain);
    const c = toNumber(cost);
    const roi = c === 0 ? 0 : ((g - c) / c) * 100;
    return calcResult(`ROI: ${percent(roi)}`, [
      { label: "Gain", value: currency(g) },
      { label: "Cost", value: currency(c) },
      { label: "Net return", value: currency(g - c) }
    ]);
  }, [cost, gain]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Calculate return on investment as a percentage."
      fields={pair(
        <ToolInput key="gain" label="Gain"><input value={gain} onChange={(e) => setGain(e.target.value)} /></ToolInput>,
        <ToolInput key="cost" label="Cost"><input value={cost} onChange={(e) => setCost(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setGain("15000");
        setCost("10000");
      }}
    />
  );
}

export function InflationCalculatorTool({ tool, ...shellProps }) {
  const [present, setPresent] = useState("100");
  const [rate, setRate] = useState("3");
  const [years, setYears] = useState("10");
  const result = useMemo(() => {
    const fv = toNumber(present) * (1 + toNumber(rate) / 100) ** toNumber(years);
    return calcResult(`Future value: ${currency(fv)}`, [
      { label: "Present value", value: currency(toNumber(present)) },
      { label: "Inflation rate", value: percent(toNumber(rate)) },
      { label: "Years", value: years }
    ]);
  }, [present, rate, years]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Estimate future cost using an annual inflation rate."
      fields={triple(
        <ToolInput key="present" label="Present value"><input value={present} onChange={(e) => setPresent(e.target.value)} /></ToolInput>,
        <ToolInput key="rate" label="Inflation rate %"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>,
        <ToolInput key="years" label="Years"><input value={years} onChange={(e) => setYears(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setPresent("100");
        setRate("3");
        setYears("10");
      }}
    />
  );
}

export function CostPerUnitCalculatorTool({ tool, ...shellProps }) {
  const [total, setTotal] = useState("250");
  const [units, setUnits] = useState("40");
  const result = useMemo(() => {
    const output = toNumber(units) === 0 ? 0 : toNumber(total) / toNumber(units);
    return calcResult(`Cost per unit: ${currency(output)}`, [
      { label: "Total cost", value: currency(toNumber(total)) },
      { label: "Units", value: units }
    ]);
  }, [total, units]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Divide a total cost across units to find unit price."
      fields={pair(
        <ToolInput key="total" label="Total cost"><input value={total} onChange={(e) => setTotal(e.target.value)} /></ToolInput>,
        <ToolInput key="units" label="Units"><input value={units} onChange={(e) => setUnits(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setTotal("250");
        setUnits("40");
      }}
    />
  );
}

export function RentSplitCalculatorTool({ tool, ...shellProps }) {
  const [rent, setRent] = useState("2400");
  const [people, setPeople] = useState("3");
  const result = useMemo(() => {
    const split = toNumber(people) === 0 ? 0 : toNumber(rent) / toNumber(people);
    return calcResult(`Each person pays ${currency(split)}`, [
      { label: "Monthly rent", value: currency(toNumber(rent)) },
      { label: "People", value: people }
    ]);
  }, [people, rent]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Split rent evenly across roommates."
      fields={pair(
        <ToolInput key="rent" label="Monthly rent"><input value={rent} onChange={(e) => setRent(e.target.value)} /></ToolInput>,
        <ToolInput key="people" label="People"><input value={people} onChange={(e) => setPeople(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setRent("2400");
        setPeople("3");
      }}
    />
  );
}

export function RentAffordabilityCalculatorTool({ tool, ...shellProps }) {
  const [income, setIncome] = useState("90000");
  const [threshold, setThreshold] = useState("30");
  const result = useMemo(() => {
    const max = (toNumber(income) * (toNumber(threshold) / 100)) / 12;
    return calcResult(`Max monthly rent: ${currency(max)}`, [
      { label: "Annual income", value: currency(toNumber(income)) },
      { label: "Threshold", value: percent(toNumber(threshold)) }
    ]);
  }, [income, threshold]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Estimate monthly rent based on annual income and a rent threshold."
      fields={pair(
        <ToolInput key="income" label="Annual income"><input value={income} onChange={(e) => setIncome(e.target.value)} /></ToolInput>,
        <ToolInput key="threshold" label="Threshold %"><input value={threshold} onChange={(e) => setThreshold(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setIncome("90000");
        setThreshold("30");
      }}
    />
  );
}

export function HourlyToSalaryCalculatorTool({ tool, ...shellProps }) {
  const [hourly, setHourly] = useState("40");
  const [hours, setHours] = useState("40");
  const result = useMemo(() => {
    const annual = toNumber(hourly) * toNumber(hours) * 52;
    return calcResult(`Estimated annual salary: ${currency(annual)}`, [
      { label: "Hourly rate", value: currency(toNumber(hourly)) },
      { label: "Hours / week", value: hours }
    ]);
  }, [hourly, hours]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Estimate annual salary from hourly pay and weekly hours."
      fields={pair(
        <ToolInput key="hourly" label="Hourly rate"><input value={hourly} onChange={(e) => setHourly(e.target.value)} /></ToolInput>,
        <ToolInput key="hours" label="Hours per week"><input value={hours} onChange={(e) => setHours(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setHourly("40");
        setHours("40");
      }}
    />
  );
}

export function SalaryHourlyComparisonCalculatorTool({ tool, ...shellProps }) {
  const [salary, setSalary] = useState("85000");
  const [hourly, setHourly] = useState("40");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [weeks, setWeeks] = useState("52");
  const result = useMemo(() => {
    const computedHourly = toNumber(salary) / ((toNumber(weeks) || 1) * (toNumber(hoursPerWeek) || 1));
    const computedSalary = toNumber(hourly) * toNumber(hoursPerWeek) * toNumber(weeks);
    return calcResult("Salary and hourly comparison", [
      { label: "Salary to hourly", value: currency(computedHourly) },
      { label: "Hourly to salary", value: currency(computedSalary) }
    ]);
  }, [hourly, hoursPerWeek, salary, weeks]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Convert salary to hourly pay and hourly pay to annual salary."
      fields={
        <>
          {pair(
            <ToolInput key="salary" label="Salary"><input value={salary} onChange={(e) => setSalary(e.target.value)} /></ToolInput>,
            <ToolInput key="hourly" label="Hourly"><input value={hourly} onChange={(e) => setHourly(e.target.value)} /></ToolInput>
          )}
          {pair(
            <ToolInput key="hoursPerWeek" label="Hours per week"><input value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} /></ToolInput>,
            <ToolInput key="weeks" label="Weeks per year"><input value={weeks} onChange={(e) => setWeeks(e.target.value)} /></ToolInput>
          )}
        </>
      }
      result={result}
      reset={() => {
        setSalary("85000");
        setHourly("40");
        setHoursPerWeek("40");
        setWeeks("52");
      }}
    />
  );
}

export function LoanAffordabilityCalculatorTool({ tool, ...shellProps }) {
  const [payment, setPayment] = useState("450");
  const [apr, setApr] = useState("6");
  const [months, setMonths] = useState("60");
  const result = useMemo(() => {
    const m = toNumber(payment);
    const r = toNumber(apr) / 100 / 12;
    const n = toNumber(months);
    const principal = r === 0 ? m * n : (m * ((1 + r) ** n - 1)) / (r * (1 + r) ** n);
    return calcResult(`Affordable loan principal: ${currency(principal)}`, [
      { label: "Monthly payment", value: currency(m) },
      { label: "APR", value: percent(toNumber(apr)) },
      { label: "Months", value: months }
    ]);
  }, [apr, months, payment]);

  return (
    <CalculatorTool
      {...shellProps}
      tool={tool}
      instructions="Estimate the principal supported by a target monthly payment."
      fields={triple(
        <ToolInput key="payment" label="Monthly payment"><input value={payment} onChange={(e) => setPayment(e.target.value)} /></ToolInput>,
        <ToolInput key="apr" label="APR %"><input value={apr} onChange={(e) => setApr(e.target.value)} /></ToolInput>,
        <ToolInput key="months" label="Months"><input value={months} onChange={(e) => setMonths(e.target.value)} /></ToolInput>
      )}
      result={result}
      reset={() => {
        setPayment("450");
        setApr("6");
        setMonths("60");
      }}
    />
  );
}

export function TipCalculatorTool({ tool, ...shellProps }) {
  const [bill, setBill] = useState("84");
  const [tip, setTip] = useState("18");
  const [people, setPeople] = useState("2");
  const result = useMemo(() => {
    const subtotal = toNumber(bill);
    const tipAmount = subtotal * (toNumber(tip) / 100);
    const total = subtotal + tipAmount;
    const each = total / Math.max(1, toNumber(people));
    return calcResult(`Total with tip: ${currency(total)}`, [{ label: "Tip amount", value: currency(tipAmount) }, { label: "Per person", value: currency(each) }]);
  }, [bill, people, tip]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Calculate tip amount and per-person total." fields={triple(<ToolInput key="bill" label="Bill"><input value={bill} onChange={(e) => setBill(e.target.value)} /></ToolInput>, <ToolInput key="tip" label="Tip %"><input value={tip} onChange={(e) => setTip(e.target.value)} /></ToolInput>, <ToolInput key="people" label="People"><input value={people} onChange={(e) => setPeople(e.target.value)} /></ToolInput>)} result={result} reset={() => { setBill("84"); setTip("18"); setPeople("2"); }} />;
}

export function SalesTaxCalculatorTool({ tool, ...shellProps }) {
  const [amount, setAmount] = useState("120");
  const [taxRate, setTaxRate] = useState("8.25");
  const result = useMemo(() => {
    const subtotal = toNumber(amount);
    const tax = subtotal * (toNumber(taxRate) / 100);
    return calcResult(`Total with tax: ${currency(subtotal + tax)}`, [{ label: "Tax amount", value: currency(tax) }, { label: "Subtotal", value: currency(subtotal) }]);
  }, [amount, taxRate]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Add sales tax to a purchase amount." fields={pair(<ToolInput key="amount" label="Amount"><input value={amount} onChange={(e) => setAmount(e.target.value)} /></ToolInput>, <ToolInput key="tax" label="Tax rate %"><input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></ToolInput>)} result={result} reset={() => { setAmount("120"); setTaxRate("8.25"); }} />;
}

export function SimpleInterestCalculatorTool({ tool, ...shellProps }) {
  const [principal, setPrincipal] = useState("5000");
  const [rate, setRate] = useState("4");
  const [years, setYears] = useState("3");
  const result = useMemo(() => {
    const interest = toNumber(principal) * (toNumber(rate) / 100) * toNumber(years);
    return calcResult(`Total value: ${currency(toNumber(principal) + interest)}`, [{ label: "Interest earned", value: currency(interest) }]);
  }, [principal, rate, years]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Calculate simple interest without compounding." fields={triple(<ToolInput key="principal" label="Principal"><input value={principal} onChange={(e) => setPrincipal(e.target.value)} /></ToolInput>, <ToolInput key="rate" label="Rate %"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>, <ToolInput key="years" label="Years"><input value={years} onChange={(e) => setYears(e.target.value)} /></ToolInput>)} result={result} reset={() => { setPrincipal("5000"); setRate("4"); setYears("3"); }} />;
}

export function MortgageCalculatorTool({ tool, ...shellProps }) {
  const [principal, setPrincipal] = useState("350000");
  const [apr, setApr] = useState("6.2");
  const [years, setYears] = useState("30");
  const result = useMemo(() => {
    const p = toNumber(principal);
    const r = toNumber(apr) / 100 / 12;
    const n = toNumber(years) * 12;
    const monthly = r === 0 ? p / n : (p * (r * (1 + r) ** n)) / ((1 + r) ** n - 1);
    return calcResult(`Estimated monthly payment: ${currency(monthly)}`, [{ label: "Loan amount", value: currency(p) }, { label: "Payments", value: String(n) }]);
  }, [apr, principal, years]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Estimate monthly mortgage payment using a standard amortization formula." fields={triple(<ToolInput key="principal" label="Loan amount"><input value={principal} onChange={(e) => setPrincipal(e.target.value)} /></ToolInput>, <ToolInput key="apr" label="APR %"><input value={apr} onChange={(e) => setApr(e.target.value)} /></ToolInput>, <ToolInput key="years" label="Years"><input value={years} onChange={(e) => setYears(e.target.value)} /></ToolInput>)} result={result} reset={() => { setPrincipal("350000"); setApr("6.2"); setYears("30"); }} />;
}

export function CagrCalculatorTool({ tool, ...shellProps }) {
  const [start, setStart] = useState("10000");
  const [end, setEnd] = useState("14500");
  const [years, setYears] = useState("4");
  const result = useMemo(() => {
    const output = toNumber(start) <= 0 || toNumber(years) <= 0 ? 0 : ((toNumber(end) / toNumber(start)) ** (1 / toNumber(years)) - 1) * 100;
    return calcResult(`CAGR: ${percent(output)}`, [{ label: "Starting value", value: currency(toNumber(start)) }, { label: "Ending value", value: currency(toNumber(end)) }]);
  }, [end, start, years]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Calculate compound annual growth rate between two values." fields={triple(<ToolInput key="start" label="Starting value"><input value={start} onChange={(e) => setStart(e.target.value)} /></ToolInput>, <ToolInput key="end" label="Ending value"><input value={end} onChange={(e) => setEnd(e.target.value)} /></ToolInput>, <ToolInput key="years" label="Years"><input value={years} onChange={(e) => setYears(e.target.value)} /></ToolInput>)} result={result} reset={() => { setStart("10000"); setEnd("14500"); setYears("4"); }} />;
}

export function PaceCalculatorTool({ tool, ...shellProps }) {
  const [distance, setDistance] = useState("5");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("42");
  const result = useMemo(() => {
    const totalMinutes = toNumber(hours) * 60 + toNumber(minutes);
    const pace = totalMinutes / Math.max(0.0001, toNumber(distance));
    return calcResult(`Pace: ${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, "0")} per mile`, [{ label: "Total time", value: `${totalMinutes} min` }]);
  }, [distance, hours, minutes]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Calculate average pace from distance and time." fields={triple(<ToolInput key="distance" label="Distance (miles)"><input value={distance} onChange={(e) => setDistance(e.target.value)} /></ToolInput>, <ToolInput key="hours" label="Hours"><input value={hours} onChange={(e) => setHours(e.target.value)} /></ToolInput>, <ToolInput key="minutes" label="Minutes"><input value={minutes} onChange={(e) => setMinutes(e.target.value)} /></ToolInput>)} result={result} reset={() => { setDistance("5"); setHours("0"); setMinutes("42"); }} />;
}

export function MarginCalculatorTool({ tool, ...shellProps }) {
  const [cost, setCost] = useState("40");
  const [price, setPrice] = useState("60");
  const result = useMemo(() => {
    const margin = toNumber(price) === 0 ? 0 : ((toNumber(price) - toNumber(cost)) / toNumber(price)) * 100;
    return calcResult(`Margin: ${percent(margin)}`, [{ label: "Cost", value: currency(toNumber(cost)) }, { label: "Selling price", value: currency(toNumber(price)) }, { label: "Profit", value: currency(toNumber(price) - toNumber(cost)) }]);
  }, [cost, price]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Calculate profit margin from cost and selling price." fields={pair(<ToolInput key="cost" label="Cost"><input value={cost} onChange={(e) => setCost(e.target.value)} /></ToolInput>, <ToolInput key="price" label="Selling price"><input value={price} onChange={(e) => setPrice(e.target.value)} /></ToolInput>)} result={result} reset={() => { setCost("40"); setPrice("60"); }} />;
}

export function CommissionCalculatorTool({ tool, ...shellProps }) {
  const [sales, setSales] = useState("12500");
  const [rate, setRate] = useState("8");
  const result = useMemo(() => {
    const commission = toNumber(sales) * (toNumber(rate) / 100);
    return calcResult(`Commission: ${currency(commission)}`, [{ label: "Sales amount", value: currency(toNumber(sales)) }, { label: "Commission rate", value: percent(toNumber(rate)) }]);
  }, [rate, sales]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Calculate commission earned from a sales amount and commission rate." fields={pair(<ToolInput key="sales" label="Sales amount"><input value={sales} onChange={(e) => setSales(e.target.value)} /></ToolInput>, <ToolInput key="rate" label="Commission %"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>)} result={result} reset={() => { setSales("12500"); setRate("8"); }} />;
}

export function PaybackPeriodCalculatorTool({ tool, ...shellProps }) {
  const [cost, setCost] = useState("12000");
  const [annualCashFlow, setAnnualCashFlow] = useState("3000");
  const result = useMemo(() => {
    const years = toNumber(annualCashFlow) === 0 ? 0 : toNumber(cost) / toNumber(annualCashFlow);
    return calcResult(`Payback period: ${number(years)} years`, [{ label: "Initial cost", value: currency(toNumber(cost)) }, { label: "Annual cash flow", value: currency(toNumber(annualCashFlow)) }]);
  }, [annualCashFlow, cost]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Estimate how long it takes for annual returns to recover an upfront cost." fields={pair(<ToolInput key="cost" label="Initial cost"><input value={cost} onChange={(e) => setCost(e.target.value)} /></ToolInput>, <ToolInput key="flow" label="Annual cash flow"><input value={annualCashFlow} onChange={(e) => setAnnualCashFlow(e.target.value)} /></ToolInput>)} result={result} reset={() => { setCost("12000"); setAnnualCashFlow("3000"); }} />;
}

export function PresentValueCalculatorTool({ tool, ...shellProps }) {
  const [futureValue, setFutureValue] = useState("10000");
  const [rate, setRate] = useState("6");
  const [years, setYears] = useState("5");
  const result = useMemo(() => {
    const pv = toNumber(futureValue) / (1 + toNumber(rate) / 100) ** toNumber(years);
    return calcResult(`Present value: ${currency(pv)}`, [{ label: "Future value", value: currency(toNumber(futureValue)) }, { label: "Discount rate", value: percent(toNumber(rate)) }, { label: "Years", value: String(toNumber(years)) }]);
  }, [futureValue, rate, years]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Discount a future amount back to present value." fields={triple(<ToolInput key="future" label="Future value"><input value={futureValue} onChange={(e) => setFutureValue(e.target.value)} /></ToolInput>, <ToolInput key="rate" label="Rate %"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>, <ToolInput key="years" label="Years"><input value={years} onChange={(e) => setYears(e.target.value)} /></ToolInput>)} result={result} reset={() => { setFutureValue("10000"); setRate("6"); setYears("5"); }} />;
}

export function FutureValueCalculatorTool({ tool, ...shellProps }) {
  const [presentValue, setPresentValue] = useState("7500");
  const [rate, setRate] = useState("6");
  const [years, setYears] = useState("5");
  const result = useMemo(() => {
    const fv = toNumber(presentValue) * (1 + toNumber(rate) / 100) ** toNumber(years);
    return calcResult(`Future value: ${currency(fv)}`, [{ label: "Present value", value: currency(toNumber(presentValue)) }, { label: "Growth rate", value: percent(toNumber(rate)) }, { label: "Years", value: String(toNumber(years)) }]);
  }, [presentValue, rate, years]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Project a present amount forward using compound growth." fields={triple(<ToolInput key="present" label="Present value"><input value={presentValue} onChange={(e) => setPresentValue(e.target.value)} /></ToolInput>, <ToolInput key="rate" label="Rate %"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>, <ToolInput key="years" label="Years"><input value={years} onChange={(e) => setYears(e.target.value)} /></ToolInput>)} result={result} reset={() => { setPresentValue("7500"); setRate("6"); setYears("5"); }} />;
}

export function SplitBillCalculatorTool({ tool, ...shellProps }) {
  const [bill, setBill] = useState("128");
  const [people, setPeople] = useState("4");
  const [tip, setTip] = useState("18");
  const result = useMemo(() => {
    const subtotal = toNumber(bill);
    const tipAmount = subtotal * (toNumber(tip) / 100);
    const total = subtotal + tipAmount;
    const perPerson = total / Math.max(1, toNumber(people));
    return calcResult(`Each person pays: ${currency(perPerson)}`, [{ label: "Bill", value: currency(subtotal) }, { label: "Tip amount", value: currency(tipAmount) }, { label: "Total", value: currency(total) }]);
  }, [bill, people, tip]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Split a bill across multiple people with an optional tip." fields={triple(<ToolInput key="bill" label="Bill"><input value={bill} onChange={(e) => setBill(e.target.value)} /></ToolInput>, <ToolInput key="people" label="People"><input value={people} onChange={(e) => setPeople(e.target.value)} /></ToolInput>, <ToolInput key="tip" label="Tip %"><input value={tip} onChange={(e) => setTip(e.target.value)} /></ToolInput>)} result={result} reset={() => { setBill("128"); setPeople("4"); setTip("18"); }} />;
}

export function BusinessDaysCalculatorTool({ tool, ...shellProps }) {
  const [startDate, setStartDate] = useState("2026-04-20");
  const [endDate, setEndDate] = useState("2026-05-01");
  const result = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const day = date.getDay();
      if (day !== 0 && day !== 6) count += 1;
    }
    return calcResult(`Business days: ${count}`, [{ label: "Start date", value: startDate }, { label: "End date", value: endDate }]);
  }, [endDate, startDate]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Count weekdays between two dates, inclusive." fields={pair(<ToolInput key="start" label="Start date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></ToolInput>, <ToolInput key="end" label="End date"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></ToolInput>)} result={result} reset={() => { setStartDate("2026-04-20"); setEndDate("2026-05-01"); }} />;
}

export function WorkdayAdderTool({ tool, ...shellProps }) {
  const [startDate, setStartDate] = useState("2026-04-20");
  const [days, setDays] = useState("10");
  const result = useMemo(() => {
    const date = new Date(startDate);
    let remaining = toNumber(days);
    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      if (![0, 6].includes(date.getDay())) remaining -= 1;
    }
    return calcResult(`Resulting workday: ${date.toISOString().slice(0, 10)}`, [{ label: "Start date", value: startDate }, { label: "Workdays added", value: String(toNumber(days)) }]);
  }, [days, startDate]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Add business days to a starting date, skipping weekends." fields={pair(<ToolInput key="start" label="Start date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></ToolInput>, <ToolInput key="days" label="Workdays to add"><input value={days} onChange={(e) => setDays(e.target.value)} /></ToolInput>)} result={result} reset={() => { setStartDate("2026-04-20"); setDays("10"); }} />;
}

export function TimezoneConverterTool({ tool, ...shellProps }) {
  const [dateTime, setDateTime] = useState("2026-04-20T10:00");
  const [fromZone, setFromZone] = useState("America/Denver");
  const [toZone, setToZone] = useState("America/New_York");
  const result = useMemo(() => {
    const date = new Date(dateTime);
    return calcResult(`Converted time: ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: toZone }).format(date)}`, [{ label: "Source timezone", value: fromZone }, { label: "Target timezone", value: toZone }]);
  }, [dateTime, fromZone, toZone]);
  const timezoneSelect = (key, value, setter) => <ToolInput key={key} label={key === "from" ? "From timezone" : "To timezone"}><select value={value} onChange={(e) => setter(e.target.value)}><option value="America/Denver">America/Denver</option><option value="America/New_York">America/New_York</option><option value="America/Los_Angeles">America/Los_Angeles</option><option value="Europe/London">Europe/London</option><option value="UTC">UTC</option><option value="Asia/Tokyo">Asia/Tokyo</option></select></ToolInput>;
  return <CalculatorTool {...shellProps} tool={tool} instructions="Convert a time into another timezone using browser Intl formatting." fields={<><ToolInput label="Date and time"><input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} /></ToolInput><div className="split-fields">{timezoneSelect("from", fromZone, setFromZone)}{timezoneSelect("to", toZone, setToZone)}</div></>} result={result} reset={() => { setDateTime("2026-04-20T10:00"); setFromZone("America/Denver"); setToZone("America/New_York"); }} />;
}

export function MeetingOverlapFinderTool({ tool, ...shellProps }) {
  const [startA, setStartA] = useState("09:00");
  const [endA, setEndA] = useState("11:30");
  const [startB, setStartB] = useState("10:15");
  const [endB, setEndB] = useState("12:00");
  const result = useMemo(() => {
    const toMinutes = (value) => {
      const [hours, minutes] = value.split(":").map((item) => Number(item) || 0);
      return hours * 60 + minutes;
    };
    const overlapStart = Math.max(toMinutes(startA), toMinutes(startB));
    const overlapEnd = Math.min(toMinutes(endA), toMinutes(endB));
    const overlap = Math.max(0, overlapEnd - overlapStart);
    return calcResult(`Overlap: ${overlap} minutes`, [{ label: "Window A", value: `${startA} - ${endA}` }, { label: "Window B", value: `${startB} - ${endB}` }]);
  }, [endA, endB, startA, startB]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Find the overlap between two meeting windows." fields={<><div className="split-fields"><ToolInput label="Start A"><input type="time" value={startA} onChange={(e) => setStartA(e.target.value)} /></ToolInput><ToolInput label="End A"><input type="time" value={endA} onChange={(e) => setEndA(e.target.value)} /></ToolInput></div><div className="split-fields"><ToolInput label="Start B"><input type="time" value={startB} onChange={(e) => setStartB(e.target.value)} /></ToolInput><ToolInput label="End B"><input type="time" value={endB} onChange={(e) => setEndB(e.target.value)} /></ToolInput></div></>} result={result} reset={() => { setStartA("09:00"); setEndA("11:30"); setStartB("10:15"); setEndB("12:00"); }} />;
}

export function CountdownGeneratorTool({ tool, ...shellProps }) {
  const [target, setTarget] = useState("2026-12-31T17:00");
  const result = useMemo(() => {
    const diff = Math.max(0, new Date(target).getTime() - Date.now());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return calcResult(`Countdown: ${days} days, ${hours} hours`, [{ label: "Target date", value: target }]);
  }, [target]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Generate a simple live countdown summary for a future date." fields={<ToolInput label="Target date and time"><input type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} /></ToolInput>} result={result} reset={() => setTarget("2026-12-31T17:00")} />;
}

export function TakeHomePayCalculatorTool({ tool, ...shellProps }) {
  const [salary, setSalary] = useState("85000");
  const [taxRate, setTaxRate] = useState("24");
  const result = useMemo(() => {
    const gross = toNumber(salary);
    const net = gross * (1 - toNumber(taxRate) / 100);
    return calcResult(`Estimated take-home pay: ${currency(net)}`, [{ label: "Gross pay", value: currency(gross) }, { label: "Estimated tax rate", value: percent(toNumber(taxRate)) }, { label: "Monthly take-home", value: currency(net / 12) }]);
  }, [salary, taxRate]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Estimate annual and monthly take-home pay from gross salary and a blended tax rate." fields={pair(<ToolInput key="salary" label="Annual salary"><input value={salary} onChange={(e) => setSalary(e.target.value)} /></ToolInput>, <ToolInput key="tax" label="Tax rate %"><input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></ToolInput>)} result={result} reset={() => { setSalary("85000"); setTaxRate("24"); }} />;
}

export function DebtPayoffCalculatorTool({ tool, ...shellProps }) {
  const [balance, setBalance] = useState("12000");
  const [rate, setRate] = useState("18");
  const [payment, setPayment] = useState("350");
  const result = useMemo(() => {
    let remaining = toNumber(balance);
    const monthlyRate = toNumber(rate) / 100 / 12;
    let months = 0;
    while (remaining > 0 && months < 1200) {
      remaining = remaining * (1 + monthlyRate) - toNumber(payment);
      months += 1;
    }
    return calcResult(`Estimated payoff time: ${months} months`, [{ label: "Starting balance", value: currency(toNumber(balance)) }, { label: "Monthly payment", value: currency(toNumber(payment)) }]);
  }, [balance, payment, rate]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Estimate debt payoff duration using a fixed monthly payment." fields={triple(<ToolInput key="balance" label="Balance"><input value={balance} onChange={(e) => setBalance(e.target.value)} /></ToolInput>, <ToolInput key="rate" label="APR %"><input value={rate} onChange={(e) => setRate(e.target.value)} /></ToolInput>, <ToolInput key="payment" label="Monthly payment"><input value={payment} onChange={(e) => setPayment(e.target.value)} /></ToolInput>)} result={result} reset={() => { setBalance("12000"); setRate("18"); setPayment("350"); }} />;
}

export function EmergencyFundCalculatorTool({ tool, ...shellProps }) {
  const [monthlyExpenses, setMonthlyExpenses] = useState("3200");
  const [months, setMonths] = useState("6");
  const result = useMemo(
    () => calcResult(`Emergency fund target: ${currency(toNumber(monthlyExpenses) * toNumber(months))}`, [
      { label: "Monthly expenses", value: currency(toNumber(monthlyExpenses)) },
      { label: "Coverage months", value: String(toNumber(months)) }
    ]),
    [monthlyExpenses, months]
  );
  return <CalculatorTool {...shellProps} tool={tool} instructions="Estimate an emergency fund target from monthly expenses and months of coverage." fields={pair(<ToolInput key="expenses" label="Monthly expenses"><input value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} /></ToolInput>, <ToolInput key="months" label="Coverage months"><input value={months} onChange={(e) => setMonths(e.target.value)} /></ToolInput>)} result={result} reset={() => { setMonthlyExpenses("3200"); setMonths("6"); }} />;
}

export function NetWorthCalculatorTool({ tool, ...shellProps }) {
  const [assets, setAssets] = useState("145000");
  const [liabilities, setLiabilities] = useState("62000");
  const result = useMemo(() => calcResult(`Net worth: ${currency(toNumber(assets) - toNumber(liabilities))}`, [{ label: "Assets", value: currency(toNumber(assets)) }, { label: "Liabilities", value: currency(toNumber(liabilities)) }]), [assets, liabilities]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Calculate net worth from total assets and total liabilities." fields={pair(<ToolInput key="assets" label="Assets"><input value={assets} onChange={(e) => setAssets(e.target.value)} /></ToolInput>, <ToolInput key="liabilities" label="Liabilities"><input value={liabilities} onChange={(e) => setLiabilities(e.target.value)} /></ToolInput>)} result={result} reset={() => { setAssets("145000"); setLiabilities("62000"); }} />;
}

export function MonthlyBudgetPlannerTool({ tool, ...shellProps }) {
  const [income, setIncome] = useState("6200");
  const [needs, setNeeds] = useState("3000");
  const [wants, setWants] = useState("1400");
  const [savings, setSavings] = useState("900");
  const result = useMemo(() => {
    const remaining = toNumber(income) - toNumber(needs) - toNumber(wants) - toNumber(savings);
    return calcResult(`Remaining budget: ${currency(remaining)}`, [{ label: "Income", value: currency(toNumber(income)) }, { label: "Allocated", value: currency(toNumber(needs) + toNumber(wants) + toNumber(savings)) }]);
  }, [income, needs, savings, wants]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Plan a monthly budget and see how much remains after allocations." fields={<div className="split-fields"><ToolInput key="income" label="Monthly income"><input value={income} onChange={(e) => setIncome(e.target.value)} /></ToolInput><ToolInput key="needs" label="Needs"><input value={needs} onChange={(e) => setNeeds(e.target.value)} /></ToolInput><ToolInput key="wants" label="Wants"><input value={wants} onChange={(e) => setWants(e.target.value)} /></ToolInput><ToolInput key="savings" label="Savings"><input value={savings} onChange={(e) => setSavings(e.target.value)} /></ToolInput></div>} result={result} reset={() => { setIncome("6200"); setNeeds("3000"); setWants("1400"); setSavings("900"); }} />;
}

export function AprVsApyCalculatorTool({ tool, ...shellProps }) {
  const [apr, setApr] = useState("12");
  const [compounds, setCompounds] = useState("12");
  const result = useMemo(() => {
    const rate = toNumber(apr) / 100;
    const n = Math.max(1, toNumber(compounds));
    const apy = (1 + rate / n) ** n - 1;
    return calcResult(`APY: ${percent(apy * 100)}`, [{ label: "APR", value: percent(toNumber(apr)) }, { label: "Compounds per year", value: String(n) }]);
  }, [apr, compounds]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Compare APR and APY using a compounding frequency." fields={pair(<ToolInput key="apr" label="APR %"><input value={apr} onChange={(e) => setApr(e.target.value)} /></ToolInput>, <ToolInput key="n" label="Compounds/year"><input value={compounds} onChange={(e) => setCompounds(e.target.value)} /></ToolInput>)} result={result} reset={() => { setApr("12"); setCompounds("12"); }} />;
}

export function OpportunityCostCalculatorTool({ tool, ...shellProps }) {
  const [optionA, setOptionA] = useState("8500");
  const [optionB, setOptionB] = useState("11200");
  const result = useMemo(() => calcResult(`Opportunity cost of choosing A: ${currency(Math.max(0, toNumber(optionB) - toNumber(optionA)))}`, [{ label: "Option A value", value: currency(toNumber(optionA)) }, { label: "Option B value", value: currency(toNumber(optionB)) }]), [optionA, optionB]);
  return <CalculatorTool {...shellProps} tool={tool} instructions="Compare two options and calculate the value given up by choosing one over the other." fields={pair(<ToolInput key="a" label="Option A value"><input value={optionA} onChange={(e) => setOptionA(e.target.value)} /></ToolInput>, <ToolInput key="b" label="Option B value"><input value={optionB} onChange={(e) => setOptionB(e.target.value)} /></ToolInput>)} result={result} reset={() => { setOptionA("8500"); setOptionB("11200"); }} />;
}
