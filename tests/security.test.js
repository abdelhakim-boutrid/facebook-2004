import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002",
  c = "00000000-0000-4000-8000-000000000003";
test("Real PostgreSQL: identity, friendship and privacy boundaries", async (t) => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
  );
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.query(
    `insert into auth.users values ($1,'{"name":"Alice"}'),($2,'{"name":"Bob"}'),($3,'{"name":"Carol"}')`,
    [a, b, c],
  );
  const as = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  };
  const denied = async (sql) => assert.rejects(() => db.exec(sql));
  await t.test("anonymous visitors cannot read profiles", async () => {
    await as(null);
    await denied("select * from profiles");
  });
  await t.test(
    "signup trigger creates profile; email is not exposed",
    async () => {
      await as(a);
      const { rows } = await db.query("select * from profiles");
      assert.equal(rows.length, 3);
      assert.equal("email" in rows[0], false);
    },
  );
  await t.test("profile ownership enforced", async () => {
    await as(a);
    await db.query("update profiles set city='Paris' where id=$1", [b]);
    assert.equal(
      (await db.query("select city from profiles where id=$1", [b])).rows[0]
        .city,
      "",
    );
    await denied(`update profiles set id='${c}' where id='${a}'`);
  });
  await t.test(
    "nonfriends cannot read or write private walls or send messages",
    async () => {
      await as(b);
      await db.exec(
        `insert into posts(author,wall_owner,body) values('${b}','${b}','Private wall')`,
      );
      await as(a);
      assert.equal((await db.query("select * from posts")).rows.length, 0);
      await denied(
        `insert into posts(author,wall_owner,body) values('${a}','${b}','Unauthorized')`,
      );
      await denied(
        `insert into messages(sender,recipient,body) values('${a}','${b}','Unauthorized')`,
      );
    },
  );
  let request;
  await t.test("friendship cannot be forged or self-accepted", async () => {
    await as(a);
    await denied(
      `insert into friendships(sender,recipient) values('${b}','${c}')`,
    );
    await denied(
      `insert into friendships(sender,recipient,status) values('${a}','${b}','accepted')`,
    );
    await denied(
      `insert into friendships(sender,recipient) values('${a}','${a}')`,
    );
    request = (
      await db.query(
        `insert into friendships(sender,recipient) values($1,$2) returning id`,
        [a, b],
      )
    ).rows[0].id;
    await denied(`select accept_friend('${request}')`);
    await denied(
      `update friendships set status='accepted' where id='${request}'`,
    );
  });
  await t.test(
    "third party cannot read pending invitations or accept them",
    async () => {
      await as(c);
      assert.equal(
        (await db.query("select * from friendships")).rows.length,
        0,
      );
      await denied(`select accept_friend('${request}')`);
    },
  );
  await t.test("reverse duplicate invitation blocked", async () => {
    await as(b);
    await denied(
      `insert into friendships(sender,recipient) values('${b}','${a}')`,
    );
  });
  await t.test("recipient accepts, enabling wall and messaging", async () => {
    await as(b);
    await db.query("select accept_friend($1)", [request]);
    await as(a);
    assert.equal((await db.query("select * from posts")).rows.length, 1);
    await db.exec(
      `insert into posts(author,wall_owner,body) values('${a}','${b}','Hello Bob'); insert into messages(sender,recipient,body) values('${a}','${b}','Only Bob can read this');`,
    );
  });
  await t.test("author spoofing and arbitrary timestamps blocked", async () => {
    await as(a);
    await denied(
      `insert into posts(author,wall_owner,body) values('${b}','${a}','Forged')`,
    );
    await denied(
      `insert into messages(sender,recipient,body) values('${b}','${a}','Forged')`,
    );
    await denied(
      `insert into messages(sender,recipient,body,created_at) values('${a}','${b}','Forged','2005-01-01')`,
    );
  });
  await t.test("private messages readable only by participants", async () => {
    await as(b);
    assert.equal((await db.query("select * from messages")).rows.length, 1);
    await as(c);
    assert.equal((await db.query("select * from messages")).rows.length, 0);
    assert.equal((await db.query("select * from posts")).rows.length, 0);
  });
  await t.test(
    "third party cannot delete a friendship or someone else’s wall",
    async () => {
      await as(c);
      await db.exec("delete from friendships; delete from posts");
      await as(a);
      assert.equal(
        (await db.query("select * from friendships")).rows.length,
        1,
      );
      assert.equal((await db.query("select * from posts")).rows.length, 2);
    },
  );
  await t.test(
    "avatar must be an image data URI; scripts are rejected",
    async () => {
      await as(a);
      await denied(
        `update profiles set avatar='javascript:alert(1)' where id='${a}'`,
      );
      await denied(
        `update profiles set avatar='data:image/svg+xml;base64,AAAA' where id='${a}'`,
      );
    },
  );
  await t.test(
    "removing friendship revokes access to wall and new messages",
    async () => {
      await as(b);
      await db.exec(`delete from friendships where id='${request}'`);
      await as(a);
      assert.equal((await db.query("select * from posts")).rows.length, 0);
      await denied(
        `insert into messages(sender,recipient,body) values('${a}','${b}','No longer friends')`,
      );
      assert.equal((await db.query("select * from messages")).rows.length, 1);
    },
  );
  await t.test("deleting auth account cascades to personal data", async () => {
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [b]);
    assert.equal((await db.query("select * from posts")).rows.length, 0);
    assert.equal((await db.query("select * from messages")).rows.length, 0);
    assert.equal((await db.query("select * from profiles")).rows.length, 2);
  });
  await db.close();
});
