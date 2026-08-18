import { JITSI_VB_ENGINE_JS } from '@/lib/jitsi-vb-engine';

type MediaHtmlInput = {
  domain: string;
  roomName: string;
  displayName: string;
  vbBase?: string;
  chromeTop?: number;
  chromeBottom?: number;
};

function escapeJs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** Motor de mídia — só streams de vídeo/áudio, zero UI visível (chrome = React Native). */
export function buildChamadaMediaHtml(input: MediaHtmlInput): string {
  const domain = escapeJs(input.domain.replace(/^https?:\/\//, '').replace(/\/+$/, ''));
  const roomName = escapeJs(input.roomName.trim().toLowerCase());
  const displayName = escapeJs(input.displayName.trim() || 'Paciente');
  const vbBase = escapeJs((input.vbBase || '/jitsi-vb').replace(/\/+$/, ''));
  const chromeTop = Math.max(0, Math.round(input.chromeTop ?? 92));
  const chromeBottom = Math.max(0, Math.round(input.chromeBottom ?? 96));

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
<style>
  html,body{margin:0;background:#000;overflow:hidden;width:100%;height:100%;pointer-events:none}
  video{background:#000;pointer-events:none}
  #remoteVideo{
    position:fixed;
    top:${chromeTop}px;
    left:0;right:0;
    bottom:${chromeBottom}px;
    width:100%;
    height:100%;
    object-fit:contain;
    object-position:center 40%;
    z-index:1
  }
  #remoteAudio{display:none}
  #localPip{
    position:fixed;right:12px;bottom:${chromeBottom + 8}px;
    width:118px;height:157px;border-radius:14px;z-index:5;overflow:hidden;pointer-events:none;
    background:#1e1f20
  }
  #localVideo{width:100%;height:100%;border-radius:14px;object-fit:cover;background:#000}
  #flipBtn,#bgBtn{
    position:absolute;bottom:6px;width:30px;height:30px;padding:0;margin:0;
    border:0;border-radius:999px;background:rgba(32,33,36,0.82);pointer-events:auto;
    display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;z-index:6
  }
  #flipBtn{left:6px}
  #bgBtn{right:6px}
  #bgBtn.is-on{background:#8ab4f8}
  #flipBtn svg,#bgBtn svg{width:15px;height:15px;stroke:#e8eaed;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  #bgBtn.is-on svg{stroke:#202124}
  .hidden{display:none!important}
</style>
</head><body>
<video id="remoteVideo" class="hidden" autoplay playsinline></video>
<audio id="remoteAudio" autoplay playsinline></audio>
<audio id="keepAliveAudio" loop playsinline style="display:none" src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA="></audio>
<div id="localPip" class="hidden">
  <video id="localVideo" autoplay playsinline muted></video>
  <button id="flipBtn" type="button" aria-label="Inverter câmera">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17l-5-5 5-5"/><path d="M13 17l5-5-5-5"/><path d="M3 12h18"/></svg>
  </button>
  <button id="bgBtn" type="button" aria-label="Fundos virtuais">
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
  </button>
</div>
<script>window.CF_VB_BASE='${vbBase}';</script>
<script>
(function(){
  if(typeof navigator==='undefined') return;
  if(navigator.mediaDevices) return;
  var legacy=navigator.webkitGetUserMedia||navigator.mozGetUserMedia;
  if(!legacy) return;
  navigator.mediaDevices={
    getUserMedia:function(constraints){
      return new Promise(function(resolve,reject){
        legacy.call(navigator,constraints,resolve,reject);
      });
    },
    enumerateDevices:function(){ return Promise.resolve([]); }
  };
})();
</script>
<script>${JITSI_VB_ENGINE_JS}</script>
<script>
(function(){
  var CFG={domain:'${domain}',roomName:'${roomName}',displayName:'${displayName}'};
  var XMPP='meet.jitsi', MUC='conference.meet.jitsi';
  var state={status:'connecting',remoteName:'',remoteHasVideo:false,localHasVideo:false,audioMuted:false,videoMuted:false,speakerMuted:false,backgroundMode:'none',videoQuality:'1080'};
  var MeetJS=null, connection=null, conference=null, localTracks=[], remoteTracks={}, disposed=false, cameraFacing='user';
  var videoQuality='1080';
  var backgroundImageUrl='';
  var applyingBg=false;
  var rawCameraTrack=null;
  var rawAudioTrack=null;
  var storedMicMediaTrack=null;
  var remotePlaybackCtx=null;
  var remotePlaybackGain=null;
  var remotePlaybackSource=null;
  var vbEffectHandle=null;
  var vbWrappedTrack=null;

  function isMobile(){
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'');
  }
  function isPortraitView(){
    return (window.innerHeight||0)>=(window.innerWidth||0);
  }
  function targetMaxHeight(){
    if(videoQuality==='1080') return 1080;
    if(videoQuality==='720') return 720;
    return 720;
  }
  function pickVideoConstraints(facing){
    var f=facing||'user';
    var maxH=targetMaxHeight();
    if(isMobile()){
      if(maxH>=1080){
        return {
          facingMode:f,
          width:{ideal:1080,max:1080,min:720},
          height:{ideal:1920,max:1920,min:1280},
          aspectRatio:{ideal:0.5625},
          frameRate:{ideal:24,max:30}
        };
      }
      return {
        facingMode:f,
        width:{ideal:720,max:1080,min:360},
        height:{ideal:1280,max:1920,min:640},
        aspectRatio:{ideal:0.5625},
        frameRate:{ideal:24,max:30}
      };
    }
    if(maxH>=1080){
      return {
        facingMode:f,
        width:{ideal:1920,max:1920,min:1280},
        height:{ideal:1080,max:1080,min:720},
        frameRate:{ideal:24,max:30}
      };
    }
    return {
      facingMode:f,
      width:{ideal:1280,max:1920,min:640},
      height:{ideal:720,max:1080,min:360},
      frameRate:{ideal:24,max:30}
    };
  }
  function localVideoCaptureHeight(track){
    if(!track) return 0;
    try{
      var mt=(track.getTrack&&track.getTrack())||(track.stream&&track.stream.getVideoTracks&&track.stream.getVideoTracks()[0]);
      var settings=mt&&mt.getSettings&&mt.getSettings();
      return settings&&settings.height||0;
    }catch(e){ return 0; }
  }
  async function ensureLocalSendQuality(){
    applyVideoQuality();
    if(!conference||!MeetJS||readVideoMuted()) return;
    var current=getLocalTrack('video');
    if(!current) return;
    if(localVideoCaptureHeight(current)>=960) return;
    try{
      var created=await MeetJS.createLocalTracks({
        devices:['video'],
        resolution:1080,
        constraints:{video:pickVideoConstraints(cameraFacing)}
      });
      var nextTrack=null;
      for(var i=0;i<(created||[]).length;i++){
        if(created[i].getType&&created[i].getType()==='video') nextTrack=created[i];
      }
      if(!nextTrack) return;
      var prevBg=state.backgroundMode||'none';
      var prevUrl=backgroundImageUrl;
      await swapVideoTrack(current,nextTrack,cameraFacing);
      if(prevBg && prevBg!=='none'){
        try{ await setBackground(prevBg, prevUrl); }catch(e){}
      }
      applyVideoQuality();
    }catch(e){}
  }
  function applyVideoQuality(){
    if(!conference) return;
    var maxH=targetMaxHeight();
    state.videoQuality=videoQuality;
    try{
      if(typeof conference.setSenderVideoConstraint==='function'){
        conference.setSenderVideoConstraint(maxH);
      }
      if(typeof conference.setReceiverVideoConstraint==='function'){
        conference.setReceiverVideoConstraint(maxH);
      }
      if(typeof conference.setReceiverConstraints==='function'){
        var constraints={
          lastN:-1,
          assumedBandwidthBps:maxH>=1080?8000000:4500000,
          defaultConstraints:{maxHeight:maxH}
        };
        try{
          var perSource={};
          var parts=conference.getParticipants&&conference.getParticipants();
          if(parts){
            for(var pi=0;pi<parts.length;pi++){
              var pid=parts[pi].getId&&parts[pi].getId()||parts[pi]._id;
              if(pid) perSource[pid]={maxHeight:maxH};
            }
          }
          if(Object.keys(perSource).length) constraints.constraints=perSource;
        }catch(e){}
        conference.setReceiverConstraints(constraints);
      }
    }catch(e){}
    emit();
  }
  function scheduleQualityBoost(){
    applyVideoQuality();
    setTimeout(applyVideoQuality,800);
    setTimeout(applyVideoQuality,2500);
  }

  function post(msg){try{window.ReactNativeWebView.postMessage(JSON.stringify(msg));}catch(e){}}
  function emit(){post({type:'state',payload:state});}

  function $(id){return document.getElementById(id);}

  function showRemote(on){
    var v=$('remoteVideo');
    if(!v) return;
    v.classList.toggle('hidden',!on);
    if(on) v.play&&v.play().catch(function(){});
  }
  function getStreamFromJitsiTrack(track){
    if(!track) return null;
    try{
      if(typeof track.getOriginalStream==='function') return track.getOriginalStream();
    }catch(e){}
    if(track.stream) return track.stream;
    var mt=track.getTrack&&track.getTrack();
    if(!mt&&track.stream){
      if(track.stream.getAudioTracks&&track.stream.getAudioTracks()[0]) mt=track.stream.getAudioTracks()[0];
      else if(track.stream.getVideoTracks&&track.stream.getVideoTracks()[0]) mt=track.stream.getVideoTracks()[0];
    }
    if(!mt) return null;
    return new MediaStream([mt]);
  }
  function getCameraStreamFromTrack(track){
    return getStreamFromJitsiTrack(track);
  }
  async function clearBackgroundEffect(){
    if(vbEffectHandle){
      try{ vbEffectHandle.stopEffect(); }catch(e){}
      vbEffectHandle=null;
    }
    var track=getLocalTrack('video');
    if(vbWrappedTrack&&rawCameraTrack&&conference){
      try{
        if(typeof conference.replaceTrack==='function'){
          await conference.replaceTrack(vbWrappedTrack,rawCameraTrack);
        }else{
          await conference.removeTrack(vbWrappedTrack);
          await conference.addTrack(rawCameraTrack);
        }
      }catch(e){}
      try{ vbWrappedTrack.dispose(); }catch(e){}
      localTracks=localTracks.filter(function(t){return t!==vbWrappedTrack;});
      if(localTracks.indexOf(rawCameraTrack)<0) localTracks.push(rawCameraTrack);
      vbWrappedTrack=null;
    }else if(rawCameraTrack&&typeof rawCameraTrack.setEffect==='function'){
      try{ await rawCameraTrack.setEffect(undefined); }catch(e){}
    }else if(track&&typeof track.setEffect==='function'){
      try{ await track.setEffect(undefined); }catch(e){}
    }
  }
  function showLocal(on){
    var pip=$('localPip'); var v=$('localVideo');
    if(pip) pip.classList.toggle('hidden',!on);
    if(v){ if(on) v.play&&v.play().catch(function(){}); }
  }

  function attach(track, el){
    if(!track||!el)return;
    try{
      if(el.srcObject){ try{ track.detach(el); }catch(e){} }
      track.attach(el);
      el.autoplay=true;el.playsInline=true;el.playsinline=true;
      el.play&&el.play().catch(function(){});
    }catch(e){}
  }

  async function enumerateVideoDevices(){
    var list=await new Promise(function(resolve){
      var md=MeetJS&&MeetJS.mediaDevices;
      if(md&&typeof md.enumerateDevices==='function'){
        try{
          var maybe=md.enumerateDevices(function(devices){ resolve(Array.isArray(devices)?devices:[]); });
          if(maybe&&typeof maybe.then==='function'){
            maybe.then(function(devices){ resolve(Array.isArray(devices)?devices:[]); }).catch(function(){ resolve([]); });
          }
          return;
        }catch(e){}
      }
      if(navigator.mediaDevices&&navigator.mediaDevices.enumerateDevices){
        navigator.mediaDevices.enumerateDevices()
          .then(function(devices){ resolve(Array.isArray(devices)?devices:[]); })
          .catch(function(){ resolve([]); });
        return;
      }
      resolve([]);
    });
    return (list||[]).filter(function(d){ return d&&d.kind==='videoinput'; });
  }

  function pickCameraDeviceId(devices, currentDeviceId, wantFacing){
    if(!devices||!devices.length) return null;
    var labelRe=wantFacing==='environment'
      ? /back|rear|traseir|traseira|environment|wide|trás|back camera/i
      : /front|user|frontal|selfie|face|front camera|câmera frontal/i;
    var i, d;
    for(i=0;i<devices.length;i++){
      d=devices[i];
      if(d.deviceId&&d.deviceId!==currentDeviceId&&labelRe.test(String(d.label||''))) return d.deviceId;
    }
    if(devices.length===2&&currentDeviceId){
      for(i=0;i<devices.length;i++){
        if(devices[i].deviceId&&devices[i].deviceId!==currentDeviceId) return devices[i].deviceId;
      }
    }
    for(i=0;i<devices.length;i++){
      d=devices[i];
      if(d.deviceId&&d.deviceId!==currentDeviceId) return d.deviceId;
    }
    return null;
  }

  async function createVideoTrackViaGum(deviceId, facingMode){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!MeetJS) return null;
    var stream=null, mt=null, videoConstraint, attempts=[], ai;
    if(deviceId){
      attempts.push({video:Object.assign({},pickVideoConstraints(facingMode),{deviceId:{exact:deviceId}}),audio:false});
    }
    if(facingMode){
      attempts.push({video:Object.assign({},pickVideoConstraints(facingMode),{facingMode:{exact:facingMode}}),audio:false});
      attempts.push({video:Object.assign({},pickVideoConstraints(facingMode),{facingMode:{ideal:facingMode}}),audio:false});
    }
    for(ai=0;ai<attempts.length;ai++){
      try{
        stream=await navigator.mediaDevices.getUserMedia(attempts[ai]);
        mt=stream&&stream.getVideoTracks&&stream.getVideoTracks()[0];
        if(mt) break;
      }catch(e){ stream=null; mt=null; }
    }
    if(!mt) return null;
    if(typeof MeetJS.createLocalTracksFromMediaStreams==='function'){
      var jt=MeetJS.createLocalTracksFromMediaStreams([{
        mediaType:'video',sourceType:'camera',stream:stream,track:mt,videoType:'camera'
      }]);
      if(jt&&jt[0]) return jt[0];
    }
    return null;
  }

  async function swapVideoTrack(current, next, nextFacing){
    if(!next) throw new Error('Nova câmera indisponível.');
    var prevBgMode=state.backgroundMode||'none';
    var prevBgUrl=backgroundImageUrl;
    if(typeof current.setEffect==='function' && prevBgMode!=='none'){
      try{ await current.setEffect(undefined); }catch(e){}
    }
    if(typeof conference.replaceTrack==='function'){
      await conference.replaceTrack(current,next);
    }else{
      try{ await conference.removeTrack(current); }catch(e){}
      await conference.addTrack(next);
    }
    localTracks=localTracks.filter(function(x){return x!==current;}).concat([next]);
    if(rawCameraTrack===current) rawCameraTrack=next;
    try{ current.dispose(); }catch(e){}
    cameraFacing=nextFacing;
    syncLocal();
    if(prevBgMode && prevBgMode!=='none'){
      try{ await setBackground(prevBgMode, prevBgUrl); }catch(e){}
    }
  }

  function syncRemote(){
    var mine=myId();
    var remote=null;
    for(var id in remoteTracks){
      if(!remoteTracks.hasOwnProperty(id) || !id || id===mine) continue;
      remote={id:id,bag:remoteTracks[id]};
      break;
    }
    if(!remote){
      state.remoteName=''; state.remoteHasVideo=false; state.status='waiting';
      showRemote(false); emit(); return;
    }
    var name=remote.bag.name||'Participante';
    var video=remote.bag.video;
    var has=!!(video && !video.isMuted() && !isLocalTrack(video));
    state.remoteName=name; state.remoteHasVideo=has; state.status='live';
    if(has){
      showRemote(true);
      attach(video,$('remoteVideo'));
      scheduleQualityBoost();
      setTimeout(function(){ var rv=$('remoteVideo'); rv&&rv.play&&rv.play().catch(function(){}); }, 120);
    }
    else showRemote(false);
    emit();
  }

  function syncLocal(){
    var videoTrack=null;
    for(var i=0;i<localTracks.length;i++){
      if(localTracks[i].getType()==='video') videoTrack=localTracks[i];
    }
    if(conference&&typeof conference.getLocalTracks==='function'){
      var confTracks=conference.getLocalTracks()||[];
      for(var j=0;j<confTracks.length;j++){
        if(confTracks[j].getType&&confTracks[j].getType()==='video') videoTrack=confTracks[j];
      }
    }
    state.audioMuted=readAudioMuted();
    var has=!!(videoTrack && !videoTrack.isMuted());
    state.localHasVideo=has;
    state.videoMuted=readVideoMuted();
    if(has){ showLocal(true); attach(videoTrack,$('localVideo')); }
    else showLocal(false);
    var bgBtn=$('bgBtn');
    if(bgBtn) bgBtn.classList.toggle('is-on', !!(state.backgroundMode && state.backgroundMode!=='none'));
    emit();
  }

  function isLocalTrack(track){
    try{
      if(!track) return false;
      if(typeof track.isLocal==='function') return !!track.isLocal();
      var pid=track.getParticipantId&&track.getParticipantId();
      var mine=myId();
      if(pid&&mine&&pid===mine) return true;
    }catch(e){}
    return false;
  }
  function harvestParticipantTracks(user){
    if(!user) return;
    try{
      var tracks=user.getTracks&&user.getTracks();
      if(!tracks||!tracks.length) return;
      for(var i=0;i<tracks.length;i++) storeRemote(tracks[i]);
    }catch(e){}
  }
  function harvestExistingParticipants(){
    if(!conference||typeof conference.getParticipants!=='function') return;
    try{
      var parts=conference.getParticipants()||[];
      for(var i=0;i<parts.length;i++) harvestParticipantTracks(parts[i]);
    }catch(e){}
  }
  function myId(){
    try{ return (conference&&conference.myUserId&&conference.myUserId())||''; }catch(e){ return ''; }
  }

  function storeRemote(track){
    if(isLocalTrack(track)) return;
    var pid=track.getParticipantId&&track.getParticipantId();
    if(!pid || pid===myId())return;
    if(!remoteTracks[pid]) remoteTracks[pid]={name:'Participante'};
    var type=track.getType&&track.getType();
    if(type==='audio'){ remoteTracks[pid].audio=track; void bindRemoteAudioPlayback(track); return; }
    remoteTracks[pid].video=track; syncRemote();
  }

  function onTrackAdded(track){ storeRemote(track); }
  function onTrackRemoved(track){
    if(isLocalTrack(track))return;
    var pid=track.getParticipantId&&track.getParticipantId();
    if(!pid||pid===myId()||!remoteTracks[pid])return;
    var type=track.getType&&track.getType();
    if(type==='audio') delete remoteTracks[pid].audio; else delete remoteTracks[pid].video;
    try{track.detach();}catch(e){}
    syncRemote();
  }
  function onTrackMuteChanged(track){
    if(isLocalTrack(track)){
      if(track.getType&&track.getType()==='audio'){
        void refreshRemoteAudioPlayback();
      }
      syncLocal();
      return;
    }
    syncRemote();
  }
  function onUserJoined(id,user){
    if(!id || id===myId()) return;
    if(!remoteTracks[id]) remoteTracks[id]={name:(user&&user.getDisplayName&&user.getDisplayName())||'Participante'};
    else if(user&&user.getDisplayName) remoteTracks[id].name=user.getDisplayName();
    harvestParticipantTracks(user);
    syncRemote();
  }
  function onUserLeft(id){
    if(!id || id===myId()) return;
    delete remoteTracks[id];
    syncRemote();
  }

  function loadLib(){
    return new Promise(function(resolve,reject){
      if(window.JitsiMeetJS) return resolve(window.JitsiMeetJS);
      var s=document.createElement('script');
      s.src='https://'+CFG.domain+'/libs/lib-jitsi-meet.min.js';
      s.async=true;
      s.onload=function(){ window.JitsiMeetJS?resolve(window.JitsiMeetJS):reject(new Error('lib indisponível')); };
      s.onerror=function(){ reject(new Error('Falha ao carregar mídia.')); };
      document.head.appendChild(s);
    });
  }

  function createLocalTracks(){
    var attempts=[
      {devices:['audio','video'],resolution:1080,constraints:{video:pickVideoConstraints('user')}},
      {devices:['audio','video'],resolution:720,constraints:{video:pickVideoConstraints('user')}},
      {devices:['audio','video'],resolution:360,constraints:{video:pickVideoConstraints('user')}},
      {devices:['audio','video'],resolution:720},
      {devices:['audio','video']},
      {devices:['video']},
      {devices:['audio']}
    ];
    var lastErr=null;
    function tryAttempt(i){
      if(i>=attempts.length) return Promise.reject(lastErr||new Error('Câmera/microfone indisponíveis.'));
      return MeetJS.createLocalTracks(attempts[i]).then(function(tracks){
        localTracks=tracks||[];
        for(var j=0;j<localTracks.length;j++){
          try{if(localTracks[j].isMuted&&localTracks[j].isMuted())localTracks[j].unmute();}catch(e){}
          if(localTracks[j].getType&&localTracks[j].getType()==='video'){
            var vst=(localTracks[j].getTrack&&localTracks[j].getTrack())||(localTracks[j].stream&&localTracks[j].stream.getVideoTracks&&localTracks[j].stream.getVideoTracks()[0]);
            var vfm=vst&&vst.getSettings&&vst.getSettings().facingMode;
            if(vfm==='environment') cameraFacing='environment';
            else cameraFacing='user';
            rawCameraTrack=localTracks[j];
          }
          if(localTracks[j].getType&&localTracks[j].getType()==='audio'){
            rawAudioTrack=localTracks[j];
          }
        }
        syncLocal();
        return localTracks;
      }).catch(function(err){
        lastErr=err;
        return tryAttempt(i+1);
      });
    }
    return tryAttempt(0);
  }

  async function join(){
    try{
      state.status='connecting'; emit();
      if(typeof navigator==='undefined'||!navigator.mediaDevices||typeof navigator.mediaDevices.getUserMedia!=='function'){
        throw new Error('Câmera indisponível neste aparelho. Feche e abra a chamada de novo.');
      }
      MeetJS=await loadLib();
      MeetJS.setLogLevel(MeetJS.logLevels.ERROR);
      try{
        if(MeetJS.setLogLevelById){
          MeetJS.setLogLevelById('xmpp:JingleSessionPC',99);
          MeetJS.setLogLevelById('xmpp:StropheErrorHandler',99);
          MeetJS.setLogLevelById('xmpp:strophe.jingle',99);
        }
      }catch(e){}
      MeetJS.init({disableAudioLevels:true,disableThirdPartyRequests:true});
      await createLocalTracks();
      connection=new MeetJS.JitsiConnection(null,null,{
        hosts:{domain:XMPP,muc:MUC},
        serviceUrl:'wss://'+CFG.domain+'/xmpp-websocket',
        bosh:'https://'+CFG.domain+'/http-bind',
        clientNode:'https://jitsi.org/jitsimeet',
        p2p:{stunServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]},
        p2pStunServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]
      });
      try{
        var xmpp=connection.xmpp||connection._xmpp;
        var jingle=xmpp&&xmpp.connection&&xmpp.connection.jingle;
        if(jingle) jingle.getStunAndTurnCredentials=function(){};
      }catch(e){}
      await new Promise(function(resolve,reject){
        function cleanup(){
          connection.removeEventListener(MeetJS.events.connection.CONNECTION_ESTABLISHED,onOk);
          connection.removeEventListener(MeetJS.events.connection.CONNECTION_FAILED,onFail);
        }
        function onOk(){cleanup();resolve();}
        function onFail(err){cleanup();reject(err||new Error('Falha na conexão.'));}
        connection.addEventListener(MeetJS.events.connection.CONNECTION_ESTABLISHED,onOk);
        connection.addEventListener(MeetJS.events.connection.CONNECTION_FAILED,onFail);
        connection.connect();
      });
      conference=connection.initJitsiConference(CFG.roomName,{
        openBridgeChannel:'websocket',
        p2p:{enabled:false},
        channelLastN:-1,
        startLastN:-1,
        videoQuality:{
          maxBitratesVideo:{
            low:400000,
            standard:1500000,
            high:4000000,
            fullHd:6000000,
            ultraHd:8000000,
            ssHigh:2500000
          }
        }
      });
      conference.on(MeetJS.events.conference.TRACK_ADDED,onTrackAdded);
      conference.on(MeetJS.events.conference.TRACK_REMOVED,onTrackRemoved);
      conference.on(MeetJS.events.conference.TRACK_MUTE_CHANGED,onTrackMuteChanged);
      conference.on(MeetJS.events.conference.USER_JOINED,onUserJoined);
      conference.on(MeetJS.events.conference.USER_LEFT,onUserLeft);
      conference.on(MeetJS.events.conference.CONFERENCE_LEFT,function(){ if(!disposed){state.status='left';emit();post({type:'left'});} });
      conference.setDisplayName(CFG.displayName);
      await new Promise(function(resolve,reject){
        function cleanup(){
          conference.removeEventListener(MeetJS.events.conference.CONFERENCE_JOINED,onJoined);
          conference.removeEventListener(MeetJS.events.conference.CONFERENCE_FAILED,onFailed);
        }
        function onJoined(){
          cleanup();
          (async function(){
            for(var i=0;i<localTracks.length;i++){
              try{ await conference.addTrack(localTracks[i]); }catch(e){}
            }
            harvestExistingParticipants();
            syncRemote();
            scheduleQualityBoost();
            void ensureLocalSendQuality();
            setTimeout(function(){ void ensureLocalSendQuality(); }, 1200);
            state.status=state.remoteHasVideo?'live':'waiting';
            emit(); post({type:'ready'}); resolve();
            startKeepAliveAudio();
            try{
              var Vb=window.CFJitsiVb;
              if(Vb&&Vb.preloadVirtualBackgroundEngine) Vb.preloadVirtualBackgroundEngine();
            }catch(e){}
          })();
        }
        function onFailed(err){cleanup();reject(err||new Error('Falha ao entrar.'));}
        conference.addEventListener(MeetJS.events.conference.CONFERENCE_JOINED,onJoined);
        conference.addEventListener(MeetJS.events.conference.CONFERENCE_FAILED,onFailed);
        conference.join();
      });
    }catch(err){
      state.status='error';
      post({type:'error',message:String((err&&err.message)||err||'Falha na consulta.')});
      emit();
    }
  }

  function getLocalTrack(type){
    if(conference&&typeof conference.getLocalTracks==='function'){
      var confTracks=conference.getLocalTracks()||[];
      for(var i=0;i<confTracks.length;i++){
        if(confTracks[i].getType&&confTracks[i].getType()===type) return confTracks[i];
      }
    }
    for(var j=0;j<localTracks.length;j++){
      if(localTracks[j].getType()===type) return localTracks[j];
    }
    return null;
  }

  async function ensureLocalTrack(type){
    var track=getLocalTrack(type);
    if(track) return track;
    if(!MeetJS||!conference) return null;
    try{
      var created=await MeetJS.createLocalTracks({devices:[type]});
      for(var i=0;i<(created||[]).length;i++){
        if(created[i].getType()!==type) continue;
        await conference.addTrack(created[i]);
        localTracks.push(created[i]);
        track=created[i];
      }
      syncLocal();
      return track;
    }catch(e){
      return null;
    }
  }

  function startKeepAliveAudio(){
    var k=$('keepAliveAudio');
    if(!k) return;
    k.volume=0.001;
    k.muted=false;
    k.play&&k.play().catch(function(){});
  }

  function readAudioMuted(){
    return !!state.audioMuted;
  }

  function getRemoteAudioTrack(){
    var mine=myId();
    for(var pid in remoteTracks){
      if(!remoteTracks.hasOwnProperty(pid)||!pid||pid===mine) continue;
      if(remoteTracks[pid].audio) return remoteTracks[pid].audio;
    }
    return null;
  }

  function getPeerConnection(){
    if(!conference) return null;
    try{
      if(typeof conference.getActivePeerConnection==='function'){
        var tpc=conference.getActivePeerConnection();
        if(tpc){
          if(tpc.peerconnection) return tpc.peerconnection;
          if(tpc._pc) return tpc._pc;
        }
      }
      var jvb=conference.jvbJingleSession;
      if(jvb&&jvb.peerconnection) return jvb.peerconnection;
      if(conference.rtc){
        if(conference.rtc.peerconnection) return conference.rtc.peerconnection;
        var active=conference.rtc.activePeerConnection;
        if(active&&active.peerconnection) return active.peerconnection;
      }
    }catch(e){}
    return null;
  }

  function getAudioSender(pc){
    if(!pc||typeof pc.getSenders!=='function') return null;
    var senders=pc.getSenders();
    var i, s;
    for(i=0;i<senders.length;i++){
      s=senders[i];
      if(s.track&&s.track.kind==='audio') return s;
    }
    for(i=0;i<senders.length;i++){
      if(!senders[i].track) return senders[i];
    }
    return null;
  }

  function setRemoteSpeakerOutput(on){
    if(remotePlaybackGain) remotePlaybackGain.gain.value=on?1:0;
    var el=$('remoteAudio');
    if(el) el.muted=!on;
  }

  async function bindRemoteAudioPlayback(jitsiTrack){
    if(!jitsiTrack||state.speakerMuted){
      setRemoteSpeakerOutput(false);
      return;
    }
    var stream=getStreamFromJitsiTrack(jitsiTrack);
    if(!stream) return;
    try{
      if(!remotePlaybackCtx){
        remotePlaybackCtx=new (window.AudioContext||window.webkitAudioContext)();
      }
      if(remotePlaybackCtx.state==='suspended'&&remotePlaybackCtx.resume){
        await remotePlaybackCtx.resume();
      }
      if(remotePlaybackSource){
        try{ remotePlaybackSource.disconnect(); }catch(e){}
        remotePlaybackSource=null;
      }
      if(!remotePlaybackGain){
        remotePlaybackGain=remotePlaybackCtx.createGain();
        remotePlaybackGain.connect(remotePlaybackCtx.destination);
      }
      remotePlaybackGain.gain.value=1;
      remotePlaybackSource=remotePlaybackCtx.createMediaStreamSource(stream);
      remotePlaybackSource.connect(remotePlaybackGain);
      var el=$('remoteAudio');
      if(el){
        el.muted=true;
        el.volume=0;
      }
    }catch(e){
      var fallback=$('remoteAudio');
      if(fallback){
        attach(jitsiTrack, fallback);
        fallback.muted=!!state.speakerMuted;
        fallback.volume=1;
        fallback.play&&fallback.play().catch(function(){});
      }
    }
  }

  async function refreshRemoteAudioPlayback(){
    var remote=getRemoteAudioTrack();
    if(!remote) return;
    await bindRemoteAudioPlayback(remote);
    setTimeout(function(){ void bindRemoteAudioPlayback(remote); }, 120);
  }

  async function setMicPublishMuted(muted){
    var track=rawAudioTrack||getLocalTrack('audio');
    if(!track){
      track=await ensureLocalTrack('audio');
      if(!track) throw new Error('Microfone indisponível.');
    }
    if(!rawAudioTrack) rawAudioTrack=track;
    var mt=track.getTrack&&track.getTrack();
    if(mt){
      if(!storedMicMediaTrack) storedMicMediaTrack=mt;
      mt.enabled=true;
    }

    var pc=getPeerConnection();
    var sender=getAudioSender(pc);
    if(sender&&typeof sender.replaceTrack==='function'){
      if(muted){
        await sender.replaceTrack(null);
      }else if(storedMicMediaTrack){
        storedMicMediaTrack.enabled=true;
        await sender.replaceTrack(storedMicMediaTrack);
      }
      state.audioMuted=muted;
      try{
        if(typeof track._sendMuteStatus==='function') track._sendMuteStatus(muted);
      }catch(e){}
      startKeepAliveAudio();
      return;
    }

    if(muted){
      if(typeof track.mute==='function') await track.mute();
      if(mt) mt.enabled=false;
    }else{
      if(mt) mt.enabled=true;
      if(typeof track.unmute==='function') await track.unmute();
    }
    state.audioMuted=muted;
    startKeepAliveAudio();
  }

  async function toggleAudio(){
    if(!conference) return;
    try{
      var next=!state.audioMuted;
      await setMicPublishMuted(next);
      await refreshRemoteAudioPlayback();
      emit();
    }catch(e){
      post({type:'warn',message:'Não foi possível alterar o microfone.'});
    }
  }
  function readVideoMuted(){
    var t=getLocalTrack('video');
    if(t&&typeof t.isMuted==='function') return !!t.isMuted();
    if(conference&&typeof conference.isVideoMuted==='function') return !!conference.isVideoMuted();
    return !!state.videoMuted;
  }

  async function toggleVideo(){
    if(!conference) return;
    try{
      var next=!readVideoMuted();
      if(typeof conference.setVideoMute==='function'){
        await conference.setVideoMute(next);
      }else if(typeof conference.toggleVideoMuted==='function'){
        if(readVideoMuted()!==next) conference.toggleVideoMuted();
      }else{
        var t=await ensureLocalTrack('video');
        if(!t){ post({type:'warn',message:'Câmera indisponível.'}); return; }
        if(next) await t.mute(); else await t.unmute();
      }
      syncLocal();
    }catch(e){
      post({type:'warn',message:'Não foi possível alterar a câmera.'});
    }
  }
  function toggleSpeaker(){
    state.speakerMuted=!state.speakerMuted;
    setRemoteSpeakerOutput(!state.speakerMuted);
    if(!state.speakerMuted) void refreshRemoteAudioPlayback();
    emit();
  }
  var flipping=false;
  async function flipCamera(){
    if(!MeetJS||!conference||flipping) return;
    var current=getLocalTrack('video');
    if(!current){
      post({type:'warn',message:'Câmera indisponível no momento.'});
      return;
    }
    if(current.isMuted&&current.isMuted()){
      post({type:'warn',message:'Ligue a câmera para inverter.'});
      return;
    }

    flipping=true;
    try{
      var nextFacing=cameraFacing==='user'?'environment':'user';
      var streamTrack=(current.getTrack&&current.getTrack())||(current.stream&&current.stream.getVideoTracks&&current.stream.getVideoTracks()[0]);
      var currentDeviceId=(streamTrack&&streamTrack.getSettings&&streamTrack.getSettings().deviceId)||'';
      var devices=await enumerateVideoDevices();
      var nextDeviceId=pickCameraDeviceId(devices,currentDeviceId,nextFacing);
      var nextTrack=null;

      if(typeof current._switchCamera==='function'){
        try{
          await current._switchCamera();
          cameraFacing=nextFacing;
          syncLocal();
          if(state.backgroundMode && state.backgroundMode!=='none'){
            try{ await setBackground(state.backgroundMode, backgroundImageUrl); }catch(e){}
          }
          return;
        }catch(e){}
      }
      if(streamTrack&&typeof streamTrack._switchCamera==='function'){
        try{
          streamTrack._switchCamera();
          cameraFacing=nextFacing;
          syncLocal();
          if(state.backgroundMode && state.backgroundMode!=='none'){
            try{ await setBackground(state.backgroundMode, backgroundImageUrl); }catch(e){}
          }
          return;
        }catch(e){}
      }

      nextTrack=await createVideoTrackViaGum(nextDeviceId,nextFacing);
      if(nextTrack){
        await swapVideoTrack(current,nextTrack,nextFacing);
        return;
      }

      if(nextDeviceId){
        try{
          var created=await MeetJS.createLocalTracks({
            devices:['video'],
            cameraDeviceId:nextDeviceId,
            constraints:{video:pickVideoConstraints(nextFacing)}
          });
          for(var di=0;di<(created||[]).length;di++){
            if(created[di].getType()==='video') nextTrack=created[di];
          }
          if(nextTrack){
            await swapVideoTrack(current,nextTrack,nextFacing);
            return;
          }
        }catch(e){}
      }

      try{
        var created2=await MeetJS.createLocalTracks({
          devices:['video'],
          constraints:{video:pickVideoConstraints(nextFacing)}
        });
        for(var i=0;i<(created2||[]).length;i++){
          if(created2[i].getType()==='video') nextTrack=created2[i];
        }
        if(nextTrack){
          await swapVideoTrack(current,nextTrack,nextFacing);
          return;
        }
      }catch(err){}

      post({type:'warn',message:'Não foi possível inverter a câmera neste aparelho.'});
    }finally{
      flipping=false;
    }
  }
  async function leave(){
    disposed=true;
    try{if(conference) await conference.leave();}catch(e){}
    for(var i=0;i<localTracks.length;i++){ try{localTracks[i].dispose();}catch(e){} }
    try{connection&&connection.disconnect();}catch(e){}
    post({type:'left'});
  }

  function resolvePresetUrl(mode){
    if(!mode||mode.indexOf('image:')!==0) return '';
    var Vb=window.CFJitsiVb;
    if(!Vb) return '';
    var id=String(mode).slice(6);
    var presets=Vb.CF_BACKGROUND_PRESETS||[];
    var preset=null;
    for(var i=0;i<presets.length;i++){
      if(presets[i]&&presets[i].id===id){ preset=presets[i]; break; }
    }
    if(!preset||typeof Vb.resolveBackgroundPresetUrl!=='function') return '';
    return Vb.resolveBackgroundPresetUrl(preset)||'';
  }

  async function setBackground(mode, imageUrl){
    var nextMode=mode||'none';
    if(applyingBg) return;
    var track=getLocalTrack('video');
    if(!track){
      post({type:'warn',message:'Ligue a câmera para aplicar o fundo.'});
      return;
    }
    if(!rawCameraTrack||track===vbWrappedTrack) rawCameraTrack=track;
    if(nextMode!=='none' && track.isMuted && track.isMuted()){
      try{ await toggleVideo(); }catch(e){}
      track=getLocalTrack('video');
      if(!track) return;
      if(!rawCameraTrack) rawCameraTrack=track;
    }
    applyingBg=true;
    var url=String(imageUrl||'');
    if(nextMode.indexOf('image:')===0 && !url) url=resolvePresetUrl(nextMode);
    state.backgroundMode=nextMode;
    backgroundImageUrl=nextMode.indexOf('image:')===0?url:'';
    emit();
    try{
      if(nextMode==='none'){
        await clearBackgroundEffect();
        syncLocal();
        return;
      }
      var Vb=window.CFJitsiVb;
      if(!Vb||typeof Vb.createBackgroundBlurEffect!=='function'){
        throw new Error('Motor de fundo indisponível.');
      }
      var ready=true;
      if(typeof Vb.preloadVirtualBackgroundEngine==='function'){
        ready=await Vb.preloadVirtualBackgroundEngine();
      }
      if(!ready) throw new Error('Não foi possível carregar o fundo virtual.');
      await clearBackgroundEffect();
      var sourceTrack=rawCameraTrack||track;
      var effect=nextMode.indexOf('image:')===0 && (url||backgroundImageUrl)
        ? await Vb.createBackgroundBlurEffect({backgroundType:'image',backgroundImageUrl:(url||backgroundImageUrl)})
        : await Vb.createBackgroundBlurEffect({backgroundType:'blur',blurValue:nextMode==='soft'?8:25});
      vbEffectHandle=effect;
      if(typeof sourceTrack.setEffect==='function'){
        await sourceTrack.setEffect(effect);
        syncLocal();
        return;
      }
      var srcStream=getCameraStreamFromTrack(sourceTrack);
      if(!srcStream||!srcStream.getVideoTracks||!srcStream.getVideoTracks()[0]){
        throw new Error('Stream da câmera indisponível.');
      }
      var outStream=effect.startEffect(srcStream);
      if(!outStream||!MeetJS||typeof MeetJS.createLocalTracksFromMediaStreams!=='function'){
        throw new Error('Efeito de fundo não suportado neste aparelho.');
      }
      var wrapped=MeetJS.createLocalTracksFromMediaStreams([{
        mediaType:'video',sourceType:'camera',stream:outStream,
        track:outStream.getVideoTracks()[0],videoType:'camera'
      }]);
      var nextWrapped=wrapped&&wrapped[0];
      if(!nextWrapped) throw new Error('Não foi possível aplicar o efeito.');
      if(typeof conference.replaceTrack==='function'){
        await conference.replaceTrack(sourceTrack,nextWrapped);
      }else{
        await conference.removeTrack(sourceTrack);
        await conference.addTrack(nextWrapped);
      }
      vbWrappedTrack=nextWrapped;
      localTracks=localTracks.filter(function(t){return t!==sourceTrack&&t!==nextWrapped;}).concat([nextWrapped]);
      syncLocal();
    }catch(err){
      state.backgroundMode='none';
      backgroundImageUrl='';
      await clearBackgroundEffect();
      syncLocal();
      post({type:'warn',message:String((err&&err.message)||'Não foi possível aplicar o efeito.')});
    }finally{
      applyingBg=false;
    }
  }

  function cycleBackground(){
    var next='blur';
    if(state.backgroundMode==='blur') next='none';
    else if(state.backgroundMode==='none') next='soft';
    else if(state.backgroundMode==='soft') next='blur';
    else next='none';
    setBackground(next,'');
  }

  async function setVideoQuality(level){
    var next=(level==='1080'||level==='720'||level==='auto')?level:'720';
    if(next===videoQuality) return;
    videoQuality=next;
    applyVideoQuality();
    var current=getLocalTrack('video');
    if(current && !readVideoMuted() && conference && MeetJS){
      try{
        var created=await MeetJS.createLocalTracks({
          devices:['video'],
          resolution:targetMaxHeight(),
          constraints:{video:pickVideoConstraints(cameraFacing)}
        });
        var nextTrack=null;
        for(var i=0;i<(created||[]).length;i++){
          if(created[i].getType()==='video') nextTrack=created[i];
        }
        if(nextTrack){
          var prevBg=state.backgroundMode||'none';
          var prevUrl=backgroundImageUrl;
          await swapVideoTrack(current,nextTrack,cameraFacing);
          if(prevBg && prevBg!=='none'){
            try{ await setBackground(prevBg, prevUrl); }catch(e){}
          }
        }
      }catch(e){}
    }
    syncRemote();
    syncLocal();
  }

  function onCommand(raw){
    try{
      var data=typeof raw==='string'?JSON.parse(raw):raw;
      if(!data||!data.cmd)return;
      if(data.cmd==='toggleAudio') toggleAudio();
      if(data.cmd==='toggleVideo') toggleVideo();
      if(data.cmd==='toggleSpeaker') toggleSpeaker();
      if(data.cmd==='flipCamera') flipCamera();
      if(data.cmd==='setBackground') setBackground(data.mode||'none', data.imageUrl||'');
      if(data.cmd==='setVideoQuality') setVideoQuality(data.quality||'720');
      if(data.cmd==='leave') leave();
    }catch(e){}
  }

  window.__cfEngineDispatch=onCommand;
  var queued=window.__cfCommandQueue||[];
  while(queued.length){ onCommand(queued.shift()); }
  document.addEventListener('message',function(e){ onCommand(e.data); });
  window.addEventListener('message',function(e){ onCommand(e.data); });
  var flipBtnEl=$('flipBtn');
  if(flipBtnEl){
    flipBtnEl.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      flipCamera();
    });
  }
  var bgBtnEl=$('bgBtn');
  if(bgBtnEl){
    bgBtnEl.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      cycleBackground();
    });
  }
  join();
})();
</script>
</body></html>`;
}
