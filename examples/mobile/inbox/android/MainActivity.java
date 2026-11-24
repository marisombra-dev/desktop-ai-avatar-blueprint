package org.example.companion.inbox;
import android.app.*;import android.os.*;import android.content.*;import android.content.pm.PackageManager;import android.widget.*;
import org.json.*;import java.net.*;import java.io.*;import java.nio.charset.StandardCharsets;import java.util.concurrent.*;
public class MainActivity extends Activity {
 static final String BASE="https://YOUR_PRIVATE_HOST.example:8444",PREF="companion_inbox",CHANNEL="messages",SERVICE="connection";
 TextView status;LinearLayout list;JSONArray notes=new JSONArray();final ExecutorService io=Executors.newSingleThreadExecutor();
 static SharedPreferences prefs(Context c){return c.getSharedPreferences(PREF,MODE_PRIVATE);}
 static void channels(Context c){NotificationManager n=c.getSystemService(NotificationManager.class);n.createNotificationChannel(new NotificationChannel(CHANNEL,"Messages from Companion",NotificationManager.IMPORTANCE_DEFAULT));n.createNotificationChannel(new NotificationChannel(SERVICE,"Inbox connection",NotificationManager.IMPORTANCE_LOW));}
 static boolean allowed(Context c){return Build.VERSION.SDK_INT<33||c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")==PackageManager.PERMISSION_GRANTED;}
 static JSONObject request(String route,JSONObject body)throws Exception{
  javax.net.ssl.HttpsURLConnection c=(javax.net.ssl.HttpsURLConnection)new URL(BASE+route).openConnection();
  try{c.setConnectTimeout(7000);c.setReadTimeout(7000);c.setInstanceFollowRedirects(false);
   if(body!=null){c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");try(OutputStream out=c.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}}
   if(c.getResponseCode()!=200)throw new IOException("Server response "+c.getResponseCode());
   try(InputStream in=c.getInputStream();ByteArrayOutputStream buf=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){buf.write(b,0,n);if(buf.size()>500000)throw new IOException("Response too large");}return new JSONObject(buf.toString("UTF-8"));}
  }finally{c.disconnect();}
 }
 static void receipt(String id,String kind)throws Exception{request("/receipt",new JSONObject().put("id",id).put("kind",kind));}
 @Override public void onCreate(Bundle state){super.onCreate(state);channels(this);
  LinearLayout layout=new LinearLayout(this);layout.setOrientation(1);layout.setPadding(30,35,30,25);
  TextView title=new TextView(this);title.setText("Companion Inbox");title.setTextSize(26);layout.addView(title);
  status=new TextView(this);status.setText("Private messages over Tailscale.");layout.addView(status);
  Button start=new Button(this);start.setText("Start receiving");layout.addView(start);start.setOnClickListener(v->{if(!allowed(this)){requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},11);return;}startReceiving();});
  Button stop=new Button(this);stop.setText("Stop receiving");layout.addView(stop);stop.setOnClickListener(v->{stopService(new Intent(this,InboxService.class));status.setText("Background checks stopped.");});
  Button compose=new Button(this);compose.setText("Send Companion a note");layout.addView(compose);compose.setOnClickListener(v->composeNote(null));
  Button refresh=new Button(this);refresh.setText("Refresh inbox");layout.addView(refresh);refresh.setOnClickListener(v->refresh());
  ScrollView scroll=new ScrollView(this);list=new LinearLayout(this);list.setOrientation(1);scroll.addView(list);layout.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));setContentView(layout);showCached();refresh();
 }
 void startReceiving(){startForegroundService(new Intent(this,InboxService.class));status.setText("Receiving enabled. Keep Tailscale connected.");}
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==11&&allowed(this))startReceiving();}
 void showCached(){try{notes=new JSONArray(prefs(this).getString("notes_cache","[]"));show(new JSONArray(prefs(this).getString("cache","[]")));}catch(Exception ignored){}}
 void refresh(){io.execute(()->{try{JSONObject data=request("/messages",null);JSONArray a=data.getJSONArray("messages"),n=data.optJSONArray("notes");if(n==null)n=new JSONArray();final JSONArray saved=n;prefs(this).edit().putString("cache",a.toString()).putString("notes_cache",saved.toString()).apply();runOnUiThread(()->{notes=saved;status.setText("Connected. Private inbox.");show(a);});}catch(Exception e){runOnUiThread(()->status.setText("Cannot reach Companion. Check Tailscale and his computer."));}});}
 void show(JSONArray a){
  list.removeAllViews();
  if(a.length()==0&&notes.length()==0){TextView t=new TextView(this);t.setText("No initiative messages yet. You can still send a note.");list.addView(t);return;}
  java.util.ArrayList<JSONObject> items=new java.util.ArrayList<>();
  for(int i=0;i<a.length();i++){JSONObject m=a.optJSONObject(i);if(m!=null)items.add(m);}
  for(int i=0;i<notes.length();i++){JSONObject n=notes.optJSONObject(i);if(n!=null)try{JSONObject item=new JSONObject(n.toString());item.put("isNote",true);items.add(item);}catch(Exception ignored){}}
  items.sort((x,y)->y.optString("at").compareTo(x.optString("at")));
  for(JSONObject m:items){
   final String id=m.optString("id"),text=m.optString("text");
   boolean mine=m.optBoolean("isNote");TextView t=new TextView(this);
   String when=m.optString("at");try{when=java.time.Instant.parse(when).atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ofPattern("MMM d, HH:mm"));}catch(Exception ignored){}
   String label=mine?"You":(m.has("replyToNote")?"Companion • reply":"Companion");
   String delivery=mine?("reviewed".equals(m.optString("status"))?" • Processed":" • Received"):"";
   t.setText(label+delivery+"  ·  "+when+"\n"+text+"\n");t.setTextSize(17);t.setPadding(0,18,0,6);list.addView(t);
   if(!mine){t.setOnClickListener(v->{new AlertDialog.Builder(this).setTitle("Companion").setMessage(text).setPositiveButton("Reply",(d,w)->composeNote(id)).setNegativeButton("Close",null).show();io.execute(()->{try{receipt(id,"opened");}catch(Exception ignored){}});});Button reply=new Button(this);reply.setText("Reply");list.addView(reply);reply.setOnClickListener(v->{composeNote(id);io.execute(()->{try{receipt(id,"opened");}catch(Exception ignored){}});});}
  }
 }
 void composeNote(String replyTo){
  final String key="draft_"+(replyTo==null?"new":replyTo);final SharedPreferences p=prefs(this);
  final EditText input=new EditText(this);input.setHint("Your note (up to 500 characters)");input.setMinLines(3);input.setMaxLines(6);input.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(500)});
  try{input.setText(new JSONObject(p.getString(key,"{}")).optString("text"));}catch(Exception ignored){}
  LinearLayout wrap=new LinearLayout(this);wrap.setOrientation(1);wrap.setPadding(32,10,32,10);wrap.addView(input);
  AlertDialog dialog=new AlertDialog.Builder(this).setTitle(replyTo==null?"Send Companion a note":"Reply to Companion").setView(wrap).setPositiveButton("Send",null).setNegativeButton("Cancel",null).create();
  dialog.setOnShowListener(v->{Button send=dialog.getButton(AlertDialog.BUTTON_POSITIVE);send.setOnClickListener(w->{
   String text=input.getText().toString().trim();if(text.isEmpty()){input.setError("Write a note first");return;}
   String id=java.util.UUID.randomUUID().toString();
   try{JSONObject prev=new JSONObject(p.getString(key,"{}"));if(text.equals(prev.optString("text"))&&prev.has("id"))id=prev.getString("id");}catch(Exception ignored){}
   final String noteId=id;
   try{JSONObject body=new JSONObject().put("id",noteId).put("replyTo",replyTo==null?JSONObject.NULL:replyTo).put("text",text);
    if(!p.edit().putString(key,body.toString()).commit()){input.setError("Could not save draft");return;}
    send.setEnabled(false);input.setEnabled(false);status.setText("Sending your note...");
    io.execute(()->{try{JSONObject res=request("/note",body);if(!res.optBoolean("ok")||!noteId.equals(res.optString("id")))throw new IOException("Missing receipt");
      p.edit().remove(key).commit();runOnUiThread(()->{dialog.dismiss();status.setText("Note received by Companion's inbox.");refresh();});
     }catch(Exception e){runOnUiThread(()->{send.setEnabled(true);input.setEnabled(true);status.setText("Not confirmed. Your draft is saved; tap Send to retry.");input.setError("Send not confirmed. Retry when connected.");});}});
   }catch(Exception e){input.setError("Could not prepare note");}
  });});dialog.show();input.requestFocus();
 }
 @Override protected void onDestroy(){super.onDestroy();io.shutdownNow();}
 public static class InboxService extends Service {
  ScheduledExecutorService worker;NotificationManager nm;
  @Override public IBinder onBind(Intent i){return null;}
  @Override public void onCreate(){super.onCreate();channels(this);nm=getSystemService(NotificationManager.class);
   PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
   startForeground(321,new Notification.Builder(this,SERVICE).setSmallIcon(android.R.drawable.stat_notify_sync).setContentTitle("Companion Inbox").setContentText("Checking private messages via Tailscale").setContentIntent(open).setOngoing(true).build());
   worker=Executors.newSingleThreadScheduledExecutor();worker.scheduleWithFixedDelay(()->poll(),0,60,TimeUnit.SECONDS);
  }
  @Override public int onStartCommand(Intent i,int flags,int id){return START_STICKY;}
  void poll(){try{JSONObject data=request("/messages",null);JSONArray a=data.getJSONArray("messages");SharedPreferences p=prefs(this);p.edit().putString("cache",a.toString()).putString("notes_cache",data.optJSONArray("notes")==null?"[]":data.optJSONArray("notes").toString()).apply();
   if(!data.optBoolean("enabled")||!allowed(this)||!nm.areNotificationsEnabled()||nm.getNotificationChannel(CHANNEL).getImportance()==NotificationManager.IMPORTANCE_NONE)return;
   java.time.ZonedDateTime now=java.time.ZonedDateTime.now(java.time.ZoneId.of("UTC"));if(now.getHour()<8||now.getHour()>=23)return;
   for(int i=0;i<a.length();i++){JSONObject m=a.getJSONObject(i);String id=m.getString("id");if(!id.matches("ses_[A-Za-z0-9]+"))continue;
    if(System.currentTimeMillis()-java.time.Instant.parse(m.getString("at")).toEpochMilli()>86400000L)continue;
    if(!p.getBoolean("seen_"+id,false)){
     PendingIntent open=PendingIntent.getActivity(this,id.hashCode(),new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
     String text=m.getString("text");nm.notify(id.hashCode(),new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_email).setContentTitle("Companion").setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setVisibility(Notification.VISIBILITY_PRIVATE).setContentIntent(open).setAutoCancel(true).build());
     p.edit().putBoolean("seen_"+id,true).commit();
    }
    if(!p.getBoolean("ack_"+id,false)){try{receipt(id,"notification_posted");p.edit().putBoolean("ack_"+id,true).apply();}catch(Exception ignored){}}
   }
  }catch(Exception ignored){}}
  @Override public void onDestroy(){if(worker!=null)worker.shutdownNow();super.onDestroy();}
 }
}
