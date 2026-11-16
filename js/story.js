/* All dialogue for the fight. `f` is the face sprite shown on Sans while the
   line is on screen. Lines without `f` are narration and get a "* " prefix. */

const STORY = {
  intro: [
    { t: `The corridor is dark. The windows are dark. Somewhere above, a clock that has never worked ticks once.` },
    { t: `hey. you made it.`, f: `face_0` },
    { t: `i was starting to think you'd take the other door.`, f: `face_0` },
    { t: `not that there is one. i checked. twice. three resets ago, give or take.`, f: `face_1` },
    { t: `so. here we are again.`, f: `face_4` },
    { t: `you know what i'm supposed to do. last corridor. last judgement. all of that.`, f: `face_0` },
    { t: `the king's orders. or... the king's silence. he never actually ordered it. he didn't have to.` },
    { t: `i'm supposed to look at you, see everything you've done, and decide if you get to walk into the throne room.`, f: `face_5` },
    { t: `so let's do it. let me look at you.` },
    { t: `He looks at you. His eye sockets are dark, and very patient.` },
    { t: `huh.`, f: `face_4` },
    { t: `you're not what the paperwork says.`, f: `face_0` },
    { t: `the paperwork says "the anomaly". very official. very scary handwriting.`, f: `face_wide_0` },
    { t: `i've been watching you for a long time. longer than you've been watching me. which is a weird thing to be proud of.`, f: `face_0` },
    { t: `forty-one times you've come down this hallway.`, f: `face_4` },
    { t: `sometimes you're kind. sometimes you're not.`, f: `face_5` },
    { t: `He doesn't finish the sentence.` },
    { t: `once you were small and you asked me for a hot dog. i gave you one. you paid in gold that didn't exist yet.`, f: `face_0` },
    { t: `i remember every version of you. and nobody remembers anything.`, f: `face_4` },
    { t: `papyrus doesn't. that's the one mercy i get. he thinks today is the first day of the rest of his life.`, f: `face_0` },
    { t: `i let him think that.`, f: `face_4` },
    { t: `anyway. you didn't come here to listen to me.`, f: `face_0` },
    { t: `you came here for a bad time.`, f: `face_wide_1` },
    { t: `The room gets colder.` },
    { t: `let's not waste your determination.`, f: `face_0` },
  ],

  phase: {
    6: [
      { t: `ok. enough warm-up.`, f: `face_wide_0` },
      { t: `you know what blue means, right?`, f: `face_0` },
      { t: `it means down.`, f: `face_5` },
      { t: `Your SOUL feels heavy.` },
      { t: `try to keep up. literally.`, f: `face_0` },
      { t: `and try to remember which way is up.`, f: `face_4` },
    ],
    11: [
      { t: `hey. you remember what my brother says about me?`, f: `face_0` },
      { t: `that i'm lazy. he's half right.`, f: `face_4` },
      { t: `i'm not lazy. i'm conserving. there's a difference.`, f: `face_1` },
      { t: `but i do have friends. big ones. they sleep in the dark between the walls.`, f: `face_wide_1` },
      { t: `Something enormous takes a breath.` },
      { t: `last phase, kid. i'm not gonna be polite about it.`, f: `face_5` },
    ],
    16: [
      { t: `can i ask you something?`, f: `face_0` },
      { t: `when you load a save... where do you go?`, f: `face_4` },
      { t: `because i've been thinking about it. a lot. more than is probably healthy.`, f: `face_0` },
      { t: `when the world stops existing for a second, and then starts again... is there a second in the middle?`, f: `face_5` },
      { t: `a second where nothing is looking at us?`, f: `face_4` },
      { t: `...because i think someone is in that second.`, f: `face_wide_0` },
      { t: `and i think he's been trying to say something for a very long time.`, f: `face_wide_0` },
      { t: `speaking of which.`, f: `face_0` },
      { t: `you feel the floor stop being a floor.`, f: `face_wide_1` },
      { t: `sorry. i'm not really standing on anything right now.`, f: `face_wide_1` },
      { t: `it's easier to do this from up here.`, f: `face_8` },
    ],
    20: [
      { t: `alright.`, f: `face_10` },
      { t: `no more bones on the floor. no more hallway.`, f: `face_8` },
      { t: `you ever wonder what i look like from the other side of a reset?`, f: `face_wide_1` },
      { t: `this is what.`, f: `face_10` },
      { t: `i'm not gonna lie to you, kid. this part isn't fair.`, f: `face_8` },
      { t: `it wasn't fair for me either.`, f: `face_wide_1` },
    ],
    24: [
      { t: `ok.`, f: `face_0` },
      { t: `ok ok ok. i can do this all day. i have done this all day. several of them.`, f: `face_4` },
      { t: `...`, f: `face_4` },
      { t: `no. you know what? no.`, f: `face_0` },
      { t: `i'm done.`, f: `face_10` },
      { t: `you want a finish? fine. here's a finish.`, f: `face_0` },
      { t: `this is my special attack.`, f: `face_wide_1` },
    ],
  },

  late: [
    { t: `...`, f: `face_4` },
    { t: `we're still here.`, f: `face_0` },
    { t: `you know what the worst part of a reset is?`, f: `face_4` },
    { t: `not the dying. the dying's quick. it's the part right before.`, f: `face_0` },
    { t: `the part where i remember how this goes, and i do it anyway.`, f: `face_5` },
    { t: `every time. same jokes. same bones. same kid.`, f: `face_4` },
    { t: `my old man would've called that a controlled experiment.`, f: `face_0` },
    { t: `the control is me. the variable is you.`, f: `face_4` },
    { t: `...i hate that i know how he'd word it.`, f: `face_5` },
    { t: `come on. one more.`, f: `face_1` },
  ],

  finaleAfter: [
    { t: `...`, f: `face_0` },
    { t: `nothing happened.`, f: `face_10` },
    { t: `yep. that's it. that's the whole special attack.`, f: `face_0` },
    { t: `i've been saving it up for a real long time. pretty impressive, huh?`, f: `face_1` },
    { t: `so. now what.`, f: `face_4` },
    { t: `you can spare me. or you can keep swinging at the empty air until one of us gets bored.`, f: `face_0` },
  ],

  act: {
    check: [
      [
        { t: `SANS - ATK 1  DEF 1` },
        { t: `The easiest enemy.` },
        { t: `Can only deal 1 damage.` },
        { t: `But he isn't even trying. He hasn't been trying for a long time.`, f: `face_0` },
      ],
      [
        { t: `SANS - ATK 1  DEF 1` },
        { t: `Still 1. He's not going to make it easy on the paperwork.` },
      ],
    ],

    talk: [
      [
        { t: `you wanna talk? in a fight?`, f: `face_0` },
        { t: `sure. i've got time. time is literally the only thing i've got.`, f: `face_1` },
        { t: `you want the short version or the version that makes you feel bad?`, f: `face_0` },
      ],
      [
        { t: `i used to keep a journal.`, f: `face_4` },
        { t: `every reset, i wrote down what you did. who you hurt. who you hugged.`, f: `face_0` },
        { t: `then one day i read it back and realized i couldn't tell which entries were the same day.`, f: `face_4` },
        { t: `so i stopped writing. now i just... remember. it's cheaper.`, f: `face_10` },
      ],
      [
        { t: `you know what's funny? everyone down here thinks i'm the funny one.`, f: `face_0` },
        { t: `nobody asks why the funny one never sleeps.`, f: `face_5` },
        { t: `it's because sleeping is just a little reset. and i've had enough of those.`, f: `face_4` },
      ],
    ],

    dad: [
      [
        { t: `you ask about his father.` },
        { t: `...`, f: `face_4` },
        { t: `huh. nobody's asked me that in a while. mostly because nobody remembers to.`, f: `face_0` },
        { t: `w.d. gaster. royal scientist. before alphys, before the amalgamates, before all of it.`, f: `face_0` },
        { t: `he was a lot of things. a genius. a bad father. a worse listener.`, f: `face_4` },
        { t: `he had this theory. that the world is held together by a few very thin threads.`, f: `face_0` },
        { t: `and if you pulled the right one, you'd find the seams.`, f: `face_5` },
        { t: `he pulled.`, f: `face_4` },
      ],
      [
        { t: `they said he fell into his own creation.`, f: `face_4` },
        { t: `one day the machine was humming, and the next... he was gone.`, f: `face_0` },
        { t: `not dead. if he were dead there'd be a body. there'd be a funeral. there'd be SOMETHING.`, f: `face_5` },
        { t: `instead there was an empty lab, and a lot of people who suddenly couldn't remember the name of the royal scientist.`, f: `face_4` },
        { t: `the king forgot him. the captain forgot him. the whole underground, all at once, like someone reached in and smoothed over the hole.`, f: `face_wide_0` },
        { t: `everyone except me.`, f: `face_4` },
        { t: `...and paps, sort of. he's got a picture on the fridge with a third guy in it. he thinks it's a friend of mine.`, f: `face_0` },
      ],
      [
        { t: `he speaks in hands, you know.`, f: `face_0`, voice: 'gaster' },
        { t: `that's what the river person says. "beware the man who speaks in hands."`, f: `face_4` },
        { t: `two hands. like he's trying to talk through a wall.`, f: `face_0`, voice: 'gaster' },
        { t: `i hear him sometimes. not words. just... static. in the second between saves, right before you load.`, f: `face_4`, voice: 'gaster' },
        { t: `he says the same thing every time.`, f: `face_5` },
        { t: `don't forget.`, f: `face_wide_1`, voice: 'gaster' },
      ],
      [
        { t: `there's a room in my basement. door's locked. i don't go down there.`, f: `face_0` },
        { t: `there's a machine in it. it doesn't do anything. it just... hums.`, f: `face_4` },
        { t: `like it's waiting for somebody to finish the equation.`, f: `face_0` },
        { t: `he built it. i just keep it dusted.`, f: `face_4` },
        { t: `hey. you're the only other thing in this world that hums like that.`, f: `face_5` },
        { t: `did you know that?`, f: `face_wide_0` },
      ],
    ],

    timelines: [
      [
        { t: `you ever notice how the world only gets saved when you're paying attention?`, f: `face_0` },
        { t: `when you're not... it keeps going. it just goes on without you.`, f: `face_4` },
        { t: `i used to lie awake doing the math. if the world only exists while you're looking at it, what are the rest of us doing?`, f: `face_5` },
        { t: `turns out we're waiting.`, f: `face_0` },
        { t: `for the door to open. for the hallway to fill with footsteps. for the save point to glow.`, f: `face_4` },
      ],
      [
        { t: `i stopped counting resets when the number got embarrassing.`, f: `face_1` },
        { t: `some of them were good ones. you know that? really good ones.`, f: `face_0` },
        { t: `there was a timeline where everyone made it out. everyone.`, f: `face_4` },
        { t: `i don't talk about that one. it's the one that hurts.`, f: `face_10` },
      ],
    ],

    remember: [
      [
        { t: `you remember something.` },
        { t: `don't. seriously. whatever you're about to say...`, f: `face_5` },
        { t: `...yeah. that one. the one with the snow. the one where the scarf got stuck in the gate.`, f: `face_4` },
        { t: `i remember it too. i remember it better than you do.`, f: `face_4` },
        { t: `that's the joke, i think.`, f: `face_0` },
      ],
    ],

    joke: [
      [
        { t: `a skeleton walks into a bar. orders a beer and a mop.`, f: `face_0` },
        { t: `heh. still got it.`, f: `face_1` },
      ],
      [
        { t: `what do you call a human with no determination?`, f: `face_0` },
        { t: `...lost.`, f: `face_1` },
        { t: `no, wait. that's just you on a tuesday.`, f: `face_0` },
      ],
      [
        { t: `why did the skeleton bring a ladder to the fight?`, f: `face_0` },
        { t: `because he...`, f: `face_0` },
        { t: `...huh. i actually forgot the end of that one.`, f: `face_4` },
        { t: `that's happening more and more.`, f: `face_4` },
      ],
    ],

    taunt: [
      [
        { t: `yeah? and?`, f: `face_5` },
        { t: `say it louder. nobody's listening.`, f: `face_0` },
        { t: `literally. i checked.`, f: `face_1` },
      ],
      [
        { t: `you really want me to get mad, huh.`, f: `face_4` },
        { t: `i've been mad. it doesn't reset anything. it just makes the hallway louder.`, f: `face_0` },
      ],
    ],
  },

  firstHit: [
    { t: `The blade goes through.` },
    { t: `...huh.`, f: `face_4` },
    { t: `that's one damage.`, f: `face_0` },
    { t: `you know what one damage means, right?`, f: `face_4` },
    { t: `i've got one hit point. it's been one hit point since the day i was born.`, f: `face_5` },
    { t: `so why am i still standing?`, f: `face_4` },
    { t: `...`, f: `face_4` },
    { t: `doesn't matter. i'm not the one who gets to lie down tonight.`, f: `face_0` },
    { t: `nice swing, though. really.`, f: `face_1` },
    { t: `don't do it again.`, f: `face_wide_1` },
  ],

  dodge: [
    [
      { t: `You swing. He is already somewhere else.` },
      { t: `nope.`, f: `face_0` },
    ],
    [
      { t: `He does not dodge so much as simply not be there.` },
      { t: `you're gonna have to be faster than that. and you're not.`, f: `face_1` },
    ],
    [
      { t: `Your attack passes through the space where he was standing a moment ago.` },
      { t: `i've had a lot of practice standing somewhere else.`, f: `face_0` },
    ],
    [
      { t: `You feel like you're going to have a bad time.` },
      { t: `i'm not gonna let you hit me. you know that, right?`, f: `face_5` },
    ],
  ],

  lowHp: [
    { t: `you okay there, buddy?`, f: `face_5` },
    { t: `you're looking a little... see-through.`, f: `face_0` },
  ],

  spareAsk: [
    { t: `spare me?`, f: `face_0` },
    { t: `you know i can't actually let you up those stairs.`, f: `face_4` },
    { t: `but i appreciate the gesture. really. that's a new one.`, f: `face_1` },
  ],

  fleeAsk: [
    { t: `flee?`, f: `face_0` },
    { t: `from what? me? there's nowhere to go, kid.`, f: `face_4` },
    { t: `this hallway is the whole world right now.`, f: `face_5` },
  ],

  itemBlank: [
    { t: `you rummage around in your pockets and find nothing but lint and a save file.` },
  ],

  killFinale: [
    { t: `heh.`, f: `face_4` },
    { t: `yeah. i figured.`, f: `face_0` },
    { t: `you always were the one who wouldn't let go.`, f: `face_10` },
    { t: `you do the thing where you feel bad about it later, right?`, f: `face_4` },
    { t: `...`, f: `face_4` },
    { t: `do me a favor.`, f: `face_0` },
    { t: `don't forget him.`, f: `face_wide_0` },
    { t: `He doesn't dodge this time.` },
    { t: `The corridor is very quiet.` },
    { t: `You stand there for a while, the way people do when there is nothing left to press.` },
  ],

  spareFinale: [
    { t: `huh.`, f: `face_0` },
    { t: `you actually did it.`, f: `face_1` },
    { t: `so that's who you are this time. good. hold onto that.`, f: `face_0` },
    { t: `the stairs are behind me. the king is behind them. whatever happens up there is yours.`, f: `face_4` },
    { t: `hey. before you go.`, f: `face_0` },
    { t: `next time you walk through the underground. next time you pass the river person. next time my door is open and the machine is humming.`, f: `face_4` },
    { t: `don't forget him.`, f: `face_wide_0` },
    { t: `somebody in this world has to remember. and it's not going to be the ones who forgot.`, f: `face_0` },
    { t: `He steps aside.` },
    { t: `You never do find out his father's name.` },
    { t: `You remember it anyway.`, },
    { t: `He waves. It is the kind of wave people give when they don't expect to see you again, and are okay with that.` },
  ],

  gameover: [
    { t: `GAME OVER` },
    { t: `You feel your sins crawling on your back.` },
    { t: `don't you get it?`, f: null },
    { t: `you can't win. you just keep coming back.`, f: null },
  ],

  revive: [
    { t: `but it refused.` },
    { t: `of course it did.`, f: `face_4` },
    { t: `your DETERMINATION returns.` },
  ],

  relaxed: [
    { t: `hey.`, f: `face_0` },
    { t: `i'm gonna take a shortcut.`, f: `face_1` },
    { t: `...that's a joke. i'm not going anywhere.`, f: `face_4` },
    { t: `i just wanted to see if you'd flinch.`, f: `face_0` },
  ],

  morning: [
    { t: `i used to think if i could just get you to stop, it'd all be over.`, f: `face_0` },
    { t: `now i think it's the opposite.`, f: `face_4` },
    { t: `i think the only thing keeping him real is somebody remembering him while the world is watching.`, f: `face_0` },
    { t: `so. keep coming back, i guess.`, f: `face_1` },
    { t: `it's a weird arrangement. but it's ours.`, f: `face_0` },
  ],
};
