// Curated, popular YouTube Shorts baked into the site (each verified embeddable
// via YouTube's oEmbed before being added). The Videos gallery imports this and
// merges any owner-added videos. To add more, append { id, title, channel, cat }.
export const VIDEOS = [
  { id:"fZBf07NkxsI", title:"The FUNNIEST Animal Shorts Ever!", channel:"The Pet Collective", cat:"Animals" },
  { id:"VCqav57PZgc", title:"The FUNNIEST Shorts of the Year — Animals", channel:"The Pet Collective", cat:"Animals" },
  { id:"5OIVickh0PQ", title:"The FUNNIEST Animal Shorts of the Month P2 🐧", channel:"Funniest Animals Ever", cat:"Animals" },
  { id:"LL_fGrOSwng", title:"The FUNNIEST Pets Shorts Ever 😹", channel:"Cute City", cat:"Animals" },
  { id:"5PkTSZtHXqU", title:"Top 3 Cutest Puppies", channel:"Dogs Now", cat:"Animals" },
  { id:"F3QWJrZVPrs", title:"They Are So Cute 🥹", channel:"We Are Dan and Sam", cat:"Animals" },
  { id:"qYyQH44igPQ", title:"This Puppy Is Too Cute! 😍🐶", channel:"Puppy Zoom", cat:"Animals" },
  { id:"1DvWEi715Ew", title:"Could You Resist That Face?", channel:"Ring", cat:"Animals" },
  { id:"s5JoqjNS3v4", title:"Cute Puppy Shorts", channel:"MARY", cat:"Animals" },

  { id:"G1XGfIqHd4o", title:"Satisfying ASMR Kinetic Sand", channel:"Sand Tagious", cat:"Satisfying" },
  { id:"_nDKK7wyRFo", title:"Very Satisfying & Relaxing Kinetic Sand ASMR", channel:"Sand Cutting ASMR", cat:"Satisfying" },
  { id:"WxDMuZ8BuSs", title:"Satisfying Shredding Compilation", channel:"Gojzer", cat:"Satisfying" },
  { id:"hKEeeaGkJnk", title:"30+ Genius Ways to Fix Broken Makeup", channel:"Satisfying Shorts", cat:"Satisfying" },
  { id:"LS5FAKSk9LY", title:"Satisfying ASMR Makeup Compilation ✨", channel:"Makeup of things", cat:"Satisfying" },

  { id:"5VF5N4hPIYE", title:"'Trickshot Queen' — the wildest basketball trick shots", channel:"Good Morning America", cat:"Sports" },
  { id:"lJm3Rqv7L_c", title:"Trampoline Basketball Trick Shot", channel:"Meekah", cat:"Sports" },
  { id:"mEhKqwcdWMo", title:"Ranking the Luckiest Basketball Trick Shots 😲", channel:"ballingcat67", cat:"Sports" },
  { id:"MTIVR0qX1Q8", title:"Top 6 Basketball Trick Shots", channel:"Colin Amazing", cat:"Sports" },
  { id:"uoYPIAQkLtE", title:"Accidental Trick Shots are Unreal", channel:"Twitch Clips Central", cat:"Sports" },
  { id:"FD-GqKgJ_RM", title:"Levi Does Basketball Trick Shots 🏀", channel:"Lively Lewis Show", cat:"Sports" },
  { id:"grBqCti-lvo", title:"10 PRO-LEVEL Insane Basketball Trick Shots", channel:"JimmyBallers20", cat:"Sports" },
  { id:"tFMg0I_2BeU", title:"World Record 100-Pointer Trickshot 🏀", channel:"Jesser", cat:"Sports" },

  { id:"p_JVjYY_Rpc", title:"Zach King 👑 Magic Shorts", channel:"Trend", cat:"Magic" },
  { id:"rVwpWnO9Mh0", title:"Magic to Surprise a Whole Theater", channel:"Zach King", cat:"Magic" },
  { id:"vL3DmDC7oXE", title:"Zach King's Magic Ride", channel:"Zach King", cat:"Magic" },
  { id:"nYd0oPnFbA8", title:"First To The Gate — Magical Short Film", channel:"Zach King", cat:"Magic" },
  { id:"sgwDyKg02Sg", title:"Zach King's BEST Magic of ALL TIME", channel:"Zach King", cat:"Magic" },

  { id:"PKEl_HA60lc", title:"Science Experiment 🧪", channel:"Inventor 101", cat:"Science" },
  { id:"0l8TFxIKmo8", title:"Be Safe 🥹 — Science Experiment", channel:"Science and Fun", cat:"Science" },
  { id:"eRzhNnyXP74", title:"Fun Science Experiments — Science Max", channel:"Scholastic", cat:"Science" },
  { id:"7L3M1vBw2HM", title:"Squid Ink Science Experiment for Kids", channel:"EYR", cat:"Science" },
  { id:"6CPbjbi778w", title:"Amazing Science Experiment", channel:"VisioNil", cat:"Science" },
  { id:"Pt7EUVwGRTM", title:"Science Experiments", channel:"The Experiment Video", cat:"Science" },
  { id:"ZLA0Olm40WM", title:"Lab Shorts: Wonders of Science", channel:"Insta Guruji", cat:"Science" },
  { id:"lWUIfyrzL-E", title:"🤯 Mind-Blowing Science Experiments", channel:"DanvsI Explains", cat:"Science" },

  { id:"dRZRdMJiZtg", title:"Top 10 Best Football Skills", channel:"Sultani Brothers", cat:"Soccer" },
  { id:"KcuY1cbXpnM", title:"Learn This Viral Skill 🇧🇷", channel:"Elastico King", cat:"Soccer" },
  { id:"9SDXPfxcfJI", title:"Learn This Magic Skill 🪄⚽️", channel:"Takuya", cat:"Soccer" },
  { id:"wppmE5LewKw", title:"Can You Do This Combo??? 🔥", channel:"Pannafiend", cat:"Soccer" },

  { id:"8J7wisUfuD4", title:"Easy Breakfast Recipes", channel:"Crunchy Kitchen", cat:"Food" },
  { id:"tunkQuKq_G8", title:"The Best Quick & Easy Dinner Recipe", channel:"Cuisine Marocaine", cat:"Food" },
  { id:"bGEUVNRFoJU", title:"Yummy Fish with Onion Recipe", channel:"Natural Life TV", cat:"Food" },
  { id:"trI0D-Lzn_U", title:"20 Super Easy & Fast Recipes", channel:"Jamie Oliver", cat:"Food" },

  { id:"uTUbcCTarmY", title:"Simple & Amazing Pencil Drawing", channel:"Drawing Fantasy", cat:"Art" },
  { id:"C-e8m66AhfA", title:"Drawing Pomni in Different Styles", channel:"Stickman Film", cat:"Art" },
  { id:"2CsFMpbcMmA", title:"Draw Wednesday! How to Draw", channel:"Howard Lee", cat:"Art" },
  { id:"IWQOb8pS-4Y", title:"Drawing With ONE Random Marker", channel:"NashVibes Art", cat:"Art" },

  { id:"jqAXHYiYPCg", title:"Top 50 Easy Life Hacks", channel:"A Dose of Daily Fun", cat:"Life Hacks" },
  { id:"JKU6koYq7k0", title:"Useful Tips, Tricks & Life Hacks", channel:"A Dose of Daily Fun", cat:"Life Hacks" },
  { id:"IvGyPnXlZR8", title:"Life-Changing Hacks You Need to Try!", channel:"5-Minute Crafts", cat:"Life Hacks" },
];
