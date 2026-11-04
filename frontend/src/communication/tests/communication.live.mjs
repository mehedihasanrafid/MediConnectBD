// No interceptions. Real login, HTTP, persistence and portal navigation against isolated services.
import { chromium, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:5184";
const fixture = JSON.parse(readFileSync("/tmp/mediconnect-communication-fixtures.json", "utf8"));
async function login(email) {
  const r = await fetch(`${base}/api/v1/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password:"Synthetic-only-123!"}) });
  assert.equal(r.status,200,await r.clone().text()); return r.json();
}
async function api(path,token,body) {
  return fetch(`${base}/api/v1/communication/conversations${path}`, {method:body?"POST":"GET",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, ...(body?{body:JSON.stringify(body)}:{})});
}
const patient=await login(fixture.patient), doctor=await login(fixture.doctor), other=await login(fixture.other);
for (const session of [patient,doctor]) {
  const r=await api("",session.accessToken); assert.equal(r.status,200);
  assert((await r.json()).items.some(c=>c.id===fixture.conversationId));
}
const content=`Live HTTP patient ${Date.now()}`;
const sent=await api(`/${fixture.conversationId}/messages`,patient.accessToken,{content,idempotencyKey:crypto.randomUUID()});
assert.equal(sent.status,201);
const history=await api(`/${fixture.conversationId}/messages`,doctor.accessToken);
assert((await history.json()).items.some(m=>m.content===content));
const reply=`Live HTTP doctor ${Date.now()}`;
assert.equal((await api(`/${fixture.conversationId}/messages`,doctor.accessToken,{content:reply,idempotencyKey:crypto.randomUUID()})).status,201);
assert((await (await api(`/${fixture.conversationId}/messages`,patient.accessToken)).json()).items.some(m=>m.content===reply));
assert.equal((await api(`/${fixture.conversationId}`,other.accessToken)).status,403);
assert.equal((await api(`/${fixture.expiredId}/messages`,patient.accessToken,{content:"Denied",idempotencyKey:crypto.randomUUID()})).status,403);
const browser=await chromium.launch({headless:true});
try {
  for (const role of ["patient","doctor"]) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const result=await page.request.post(`${base}/api/v1/auth/login`,{data:{email:fixture[role],password:"Synthetic-only-123!"}});
    assert.equal(result.status(),200);
    await page.goto(`${base}/communication`);
    await expect(page).toHaveURL(new RegExp(`/${role}/communication$`));
    await expect(page.getByRole("button",{name:"Consultation Messages",exact:true})).toHaveAttribute("aria-current","page");
    await expect(page.getByRole("heading",{name:"Consultation Communication Hub"})).toBeVisible();
    // The first fixture conversation can be expired, so use server list to locate our active record.
    const list=await (await api("",role==="patient"?patient.accessToken:doctor.accessToken)).json();
    assert(list.items.some(c=>c.id===fixture.conversationId));
    await page.locator(`[data-conversation-id="${fixture.conversationId}"]`).click();
    await expect(page.getByRole("log")).toContainText(content);
    await expect(page.getByRole("log")).toContainText(reply);
    const browserContent = `Browser persisted ${role} ${Date.now()}`;
    await page.getByRole("textbox", { name: "Message", exact: true }).fill(browserContent);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("log")).toContainText(browserContent);
    const persisted = await api(`/${fixture.conversationId}/messages`,role === "patient" ? doctor.accessToken : patient.accessToken);
    assert((await persisted.json()).items.some(m => m.content === browserContent));
    await page.reload();
    await page.locator(`[data-conversation-id="${fixture.conversationId}"]`).click();
    await expect(page.getByRole("log")).toContainText(reply);
    await page.screenshot({path:`/tmp/communication-live-${role}.png`,fullPage:true});
    await page.close();
  }
  for (let i=0;i<32;i++) {
    assert.equal((await api(`/${fixture.conversationId}/messages`,patient.accessToken,
      {content:`Pagination ${i}`,idempotencyKey:crypto.randomUUID()})).status,201);
  }
  const page=await browser.newPage();
  await page.request.post(`${base}/api/v1/auth/login`,{data:{email:fixture.patient,password:"Synthetic-only-123!"}});
  await page.goto(`${base}/patient/communication`);
  await page.locator(`[data-conversation-id="${fixture.conversationId}"]`).click();
  await expect(page.getByRole("button",{name:"Load earlier messages"})).toBeVisible();
  await page.getByRole("button",{name:"Load earlier messages"}).click();
  await expect(page.getByRole("log")).toContainText(content);
  await page.close();
} finally { await browser.close(); }
console.log("LIVE PASS: both roles, persisted roundtrip, reload, unrelated-user denial, expiry and role sidebars; no intercepted requests.");
