/**
 * Bible Verses — curated collection for daily devotional.
 * Seeded RNG for deterministic daily selection.
 */

export interface BibleVerse {
  reference: string;
  text: string;
  theme: string;
}

// Seeded pseudo-random number generator (mulberry32)
export function seededRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h |= 0; h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function getDailyVerse(date: string): { verse: BibleVerse; index: number } {
  const rng = seededRng(date + '-ewluong-os-word');
  const index = Math.floor(rng() * VERSES.length);
  return { verse: VERSES[index], index };
}

export const VERSES: BibleVerse[] = [
  // --- Trust & Faith ---
  { reference: 'Proverbs 3:5-6', text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', theme: 'trust' },
  { reference: 'Hebrews 11:1', text: 'Now faith is confidence in what we hope for and assurance about what we do not see.', theme: 'faith' },
  { reference: 'Isaiah 41:10', text: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.', theme: 'courage' },
  { reference: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.', theme: 'hope' },
  { reference: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', theme: 'purpose' },
  { reference: 'Psalm 46:10', text: 'Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.', theme: 'peace' },
  { reference: 'Matthew 6:33', text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.', theme: 'priorities' },
  { reference: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.', theme: 'strength' },
  { reference: 'Joshua 1:9', text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.', theme: 'courage' },
  { reference: 'Psalm 23:1-3', text: 'The LORD is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.', theme: 'provision' },

  // --- Wisdom ---
  { reference: 'James 1:5', text: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.', theme: 'wisdom' },
  { reference: 'Proverbs 4:7', text: 'The beginning of wisdom is this: Get wisdom. Though it cost all you have, get understanding.', theme: 'wisdom' },
  { reference: 'Psalm 119:105', text: 'Your word is a lamp for my feet, a light on my path.', theme: 'guidance' },
  { reference: 'Colossians 3:23', text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.', theme: 'work' },
  { reference: 'Proverbs 16:3', text: 'Commit to the LORD whatever you do, and he will establish your plans.', theme: 'planning' },
  { reference: 'Ecclesiastes 3:1', text: 'There is a time for everything, and a season for every activity under the heavens.', theme: 'seasons' },
  { reference: 'Proverbs 27:17', text: 'As iron sharpens iron, so one person sharpens another.', theme: 'fellowship' },
  { reference: 'Romans 12:2', text: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God\'s will is — his good, pleasing and perfect will.', theme: 'transformation' },

  // --- Love ---
  { reference: '1 Corinthians 13:4-5', text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.', theme: 'love' },
  { reference: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', theme: 'salvation' },
  { reference: '1 John 4:19', text: 'We love because he first loved us.', theme: 'love' },
  { reference: 'Romans 5:8', text: 'But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.', theme: 'grace' },
  { reference: 'John 15:13', text: 'Greater love has no one than this: to lay down one\'s life for one\'s friends.', theme: 'sacrifice' },
  { reference: 'Ephesians 2:8-9', text: 'For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God — not by works, so that no one can boast.', theme: 'grace' },

  // --- Peace & Comfort ---
  { reference: 'Philippians 4:6-7', text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.', theme: 'peace' },
  { reference: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.', theme: 'rest' },
  { reference: 'John 14:27', text: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.', theme: 'peace' },
  { reference: 'Psalm 34:18', text: 'The LORD is close to the brokenhearted and saves those who are crushed in spirit.', theme: 'comfort' },
  { reference: '2 Corinthians 12:9', text: 'But he said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Therefore I will boast all the more gladly about my weaknesses, so that Christ\'s power may rest on me.', theme: 'grace' },
  { reference: 'Isaiah 40:31', text: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', theme: 'renewal' },
  { reference: 'Psalm 91:1-2', text: 'Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the LORD, "He is my refuge and my fortress, my God, in whom I trust."', theme: 'protection' },

  // --- Character & Growth ---
  { reference: 'Galatians 5:22-23', text: 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control. Against such things there is no law.', theme: 'character' },
  { reference: 'James 1:2-4', text: 'Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance. Let perseverance finish its work so that you may be mature and complete, not lacking anything.', theme: 'perseverance' },
  { reference: 'Micah 6:8', text: 'He has shown you, O mortal, what is good. And what does the LORD require of you? To act justly and to love mercy and to walk humbly with your God.', theme: 'humility' },
  { reference: 'Philippians 2:3-4', text: 'Do nothing out of selfish ambition or vain conceit. Rather, in humility value others above yourselves, not looking to your own interests but each of you to the interests of the others.', theme: 'humility' },
  { reference: 'Ephesians 4:29', text: 'Do not let any unwholesome talk come out of your mouths, but only what is helpful for building others up according to their needs, that it may benefit those who listen.', theme: 'speech' },
  { reference: '2 Timothy 1:7', text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.', theme: 'discipline' },
  { reference: 'Proverbs 11:2', text: 'When pride comes, then comes disgrace, but with humility comes wisdom.', theme: 'humility' },
  { reference: 'Romans 12:12', text: 'Be joyful in hope, patient in affliction, faithful in prayer.', theme: 'perseverance' },

  // --- Purpose & Identity ---
  { reference: 'Ephesians 2:10', text: 'For we are God\'s handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.', theme: 'purpose' },
  { reference: 'Psalm 139:14', text: 'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.', theme: 'identity' },
  { reference: 'Matthew 5:14-16', text: 'You are the light of the world. A town built on a hill cannot be hidden. Neither do people light a lamp and put it under a bowl. Instead they put it on its stand, and it gives light to everyone in the house.', theme: 'purpose' },
  { reference: '1 Peter 2:9', text: 'But you are a chosen people, a royal priesthood, a holy nation, God\'s special possession, that you may declare the praises of him who called you out of darkness into his wonderful light.', theme: 'identity' },
  { reference: 'Jeremiah 1:5', text: 'Before I formed you in the womb I knew you, before you were born I set you apart; I appointed you as a prophet to the nations.', theme: 'calling' },

  // --- Gratitude & Joy ---
  { reference: '1 Thessalonians 5:16-18', text: 'Rejoice always, pray continually, give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.', theme: 'gratitude' },
  { reference: 'Psalm 118:24', text: 'The LORD has done it this very day; let us rejoice today and be glad.', theme: 'joy' },
  { reference: 'Nehemiah 8:10', text: 'Do not grieve, for the joy of the LORD is your strength.', theme: 'joy' },
  { reference: 'Psalm 100:4-5', text: 'Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name. For the LORD is good and his love endures forever; his faithfulness continues through all generations.', theme: 'worship' },

  // --- Overcoming ---
  { reference: 'Romans 8:37', text: 'No, in all these things we are more than conquerors through him who loved us.', theme: 'victory' },
  { reference: '1 John 5:4', text: 'For everyone born of God overcomes the world. This is the victory that has overcome the world, even our faith.', theme: 'overcoming' },
  { reference: 'Deuteronomy 31:6', text: 'Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you.', theme: 'courage' },
  { reference: 'Psalm 27:1', text: 'The LORD is my light and my salvation — whom shall I fear? The LORD is the stronghold of my life — of whom shall I be afraid?', theme: 'courage' },
  { reference: 'Isaiah 43:2', text: 'When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you. When you walk through the fire, you will not be burned; the flames will not set you ablaze.', theme: 'protection' },
  { reference: 'Psalm 37:4', text: 'Take delight in the LORD, and he will give you the desires of your heart.', theme: 'desire' },

  // --- Patience & Waiting ---
  { reference: 'Psalm 27:14', text: 'Wait for the LORD; be strong and take heart and wait for the LORD.', theme: 'patience' },
  { reference: 'Lamentations 3:25', text: 'The LORD is good to those whose hope is in him, to the one who seeks him.', theme: 'seeking' },
  { reference: 'Habakkuk 2:3', text: 'For the revelation awaits an appointed time; it speaks of the end and will not prove false. Though it linger, wait for it; it will certainly come and will not delay.', theme: 'patience' },
  { reference: 'Psalm 40:1', text: 'I waited patiently for the LORD; he turned to me and heard my cry.', theme: 'patience' },

  // --- Forgiveness & Mercy ---
  { reference: 'Colossians 3:13', text: 'Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.', theme: 'forgiveness' },
  { reference: 'Psalm 103:12', text: 'As far as the east is from the west, so far has he removed our transgressions from us.', theme: 'forgiveness' },
  { reference: '1 John 1:9', text: 'If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness.', theme: 'confession' },
  { reference: 'Matthew 6:14', text: 'For if you forgive other people when they sin against you, your heavenly Father will also forgive you.', theme: 'forgiveness' },

  // --- Provision ---
  { reference: 'Matthew 6:26', text: 'Look at the birds of the air; they do not sow or reap or store away in barns, and yet your heavenly Father feeds them. Are you not much more valuable than they?', theme: 'provision' },
  { reference: 'Philippians 4:19', text: 'And my God will meet all your needs according to the riches of his glory in Christ Jesus.', theme: 'provision' },
  { reference: 'Psalm 37:25', text: 'I was young and now I am old, yet I have never seen the righteous forsaken or their children begging bread.', theme: 'provision' },
  { reference: 'Malachi 3:10', text: '"Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this," says the LORD Almighty, "and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it."', theme: 'generosity' },

  // --- The Word ---
  { reference: 'Hebrews 4:12', text: 'For the word of God is alive and active. Sharper than any double-edged sword, it penetrates even to dividing soul and spirit, joints and marrow; it judges the thoughts and attitudes of the heart.', theme: 'scripture' },
  { reference: '2 Timothy 3:16-17', text: 'All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness, so that the servant of God may be thoroughly equipped for every good work.', theme: 'scripture' },
  { reference: 'John 1:1', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.', theme: 'Christ' },
  { reference: 'Isaiah 55:11', text: 'So is my word that goes out from my mouth: It will not return to me empty, but will accomplish what I desire and achieve the purpose for which I sent it.', theme: 'promise' },

  // --- Endurance ---
  { reference: 'Hebrews 12:1-2', text: 'Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.', theme: 'perseverance' },
  { reference: 'Galatians 6:9', text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.', theme: 'perseverance' },
  { reference: 'Romans 5:3-4', text: 'Not only so, but we also glory in our sufferings, because we know that suffering produces perseverance; perseverance, character; and character, hope.', theme: 'suffering' },
  { reference: '1 Corinthians 9:24', text: 'Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize.', theme: 'discipline' },

  // --- New Creation ---
  { reference: '2 Corinthians 5:17', text: 'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!', theme: 'renewal' },
  { reference: 'Revelation 21:5', text: 'He who was seated on the throne said, "I am making everything new!" Then he said, "Write this down, for these words are trustworthy and true."', theme: 'renewal' },
  { reference: 'Ezekiel 36:26', text: 'I will give you a new heart and put a new spirit in you; I will remove from you your heart of stone and give you a heart of flesh.', theme: 'transformation' },
  { reference: 'Isaiah 43:18-19', text: 'Forget the former things; do not dwell on the past. See, I am doing a new thing! Now it springs up; do you not perceive it? I am making a way in the wilderness and streams in the wasteland.', theme: 'renewal' },

  // --- Prayer ---
  { reference: 'Matthew 7:7', text: 'Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.', theme: 'prayer' },
  { reference: 'Psalm 145:18', text: 'The LORD is near to all who call on him, to all who call on him in truth.', theme: 'prayer' },
  { reference: 'Mark 11:24', text: 'Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours.', theme: 'faith' },
  { reference: 'Romans 8:26', text: 'In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us through wordless groans.', theme: 'prayer' },

  // --- Light & Truth ---
  { reference: 'John 8:12', text: 'When Jesus spoke again to the people, he said, "I am the light of the world. Whoever follows me will never walk in darkness, but will have the light of life."', theme: 'light' },
  { reference: 'John 14:6', text: 'Jesus answered, "I am the way and the truth and the life. No one comes to the Father except through me."', theme: 'truth' },
  { reference: 'Psalm 119:130', text: 'The unfolding of your words gives light; it gives understanding to the simple.', theme: 'understanding' },
  { reference: 'John 8:32', text: 'Then you will know the truth, and the truth will set you free.', theme: 'freedom' },

  // --- Community ---
  { reference: 'Hebrews 10:24-25', text: 'And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together, as some are in the habit of doing, but encouraging one another.', theme: 'fellowship' },
  { reference: 'Ecclesiastes 4:9-10', text: 'Two are better than one, because they have a good return for their labor: If either of them falls down, one can help the other up.', theme: 'fellowship' },
  { reference: 'Matthew 18:20', text: 'For where two or three gather in my name, there am I with them.', theme: 'presence' },

  // --- Eternal Perspective ---
  { reference: '2 Corinthians 4:17-18', text: 'For our light and momentary troubles are achieving for us an eternal glory that far outweighs them all. So we fix our eyes not on what is seen, but on what is unseen, since what is seen is temporary, but what is unseen is eternal.', theme: 'eternity' },
  { reference: 'Matthew 6:19-20', text: 'Do not store up for yourselves treasures on earth, where moths and vermin destroy, and where thieves break in and steal. But store up for yourselves treasures in heaven.', theme: 'eternity' },
  { reference: 'Colossians 3:2', text: 'Set your minds on things above, not on earthly things.', theme: 'focus' },
  { reference: 'Revelation 22:13', text: 'I am the Alpha and the Omega, the First and the Last, the Beginning and the End.', theme: 'sovereignty' },
];
