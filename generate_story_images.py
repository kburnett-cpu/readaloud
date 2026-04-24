#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""
Generate story illustrations for ReadAloud books using Gemini image generation.

Usage:
    uv run generate_story_images.py [book-id] [--page N] [--skip-existing] [--all]

Examples:
    uv run generate_story_images.py abuelas-kitchen
    uv run generate_story_images.py the-mango-tree --page 3
    uv run generate_story_images.py --all
    uv run generate_story_images.py --all --skip-existing
"""

import argparse
import os
import sys
import time
from io import BytesIO
from pathlib import Path

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBWtMtsIec47gsIHLA7QbDheCsnLBlHWzc")
STORIES_DIR = Path(__file__).parent / "public" / "stories"
ASPECT_RATIO = "16:9"
RESOLUTION = "1K"

# ─── BOOK PROMPTS ─────────────────────────────────────────────────────────────

BOOKS = {

    "abuelas-kitchen": {
        "title": "Grandma's Kitchen",
        "master_style": (
            "MASTER STYLE: Vibrant, warm children's book illustration in soft digital painting style. "
            "Clean outlines with rich, saturated Caribbean colors — warm golds, tropical terracotta reds, "
            "kitchen greens, cheerful yellows. Characters are Dominican with warm brown skin, dark curly "
            "or wavy hair, expressive faces full of joy. Setting is a colorful, cozy Dominican kitchen "
            "and neighborhood. 16:9 landscape format. Style feels like a modern animated film — bright, "
            "clear, and full of warmth and detail. Every image should feel like a warm hug, inviting a "
            "4-year-old child into a grandmother's loving kitchen."
        ),
        "pages": [
            # page 1
            ("A Dominican child (about 4–5 years old, warm brown skin, dark curly hair, bright T-shirt and shorts) "
             "walks happily down a sunny Caribbean street toward a large colorful Dominican house (painted coral, yellow, "
             "or turquoise with a wide porch and big yard). Morning sun is bright and warm. The child skips or carries "
             "something, smiling big. Palm trees and flowering shrubs line the path. The neighborhood is cheerful, warm, "
             "and safe. Children's book illustration, 16:9 landscape, vibrant children's book illustration style, "
             "soft digital painting, clean outlines."),
            # page 2
            ("Interior of a warm colorful Dominican kitchen. A Dominican grandmother (abuela, 60s–70s, warm brown skin, "
             "silver hair in a bun, round soft face with deep laugh lines, colorful floral apron over simple housedress) "
             "stands at the stove cooking and smiling warmly as a child enters through the front door. Morning light "
             "streams through the open door. The kitchen has colorful tiles, a heavy pot on a gas stove, wooden cutting "
             "board, window with curtains. Steam rises from the pot. The kitchen feels like the heart of the home. "
             "Children's book illustration, 16:9 landscape."),
            # page 3
            ("Warm Dominican kitchen. The Dominican child (4–5, warm brown skin, dark curly hair) stands in the kitchen "
             "with eyes closed and a big delighted smile, nose tilted up smelling something wonderful. Around the kitchen, "
             "garlic bulbs, onions, and peppers are on the counter. A big pot steams on the stove. Abuela (Dominican "
             "grandmother, silver hair bun, colorful floral apron) stirs the pot and smiles at the child. Wisps of "
             "fragrant steam curl in the warm kitchen air. Children's book illustration, 16:9 landscape."),
            # page 4
            ("Warm Dominican kitchen. Abuela (Dominican grandmother, silver hair bun, colorful floral apron) bends down "
             "behind the Dominican child (4–5, warm brown skin, dark curly hair) and ties a small child-sized apron "
             "around the child's waist. The child looks proud and excited, standing tall. Abuela also holds out a big "
             "wooden spoon toward the child with a warm smile. The child reaches for the spoon eagerly. A special "
             "moment of being welcomed as a helper. Children's book illustration, 16:9 landscape."),
            # page 5
            ("Warm Dominican kitchen. The Dominican child (4–5, warm brown skin, dark curly hair, small apron tied on) "
             "stands on a small step stool in front of the stove, stirring a large dark pot with a big wooden spoon. "
             "The pot is full of deep red beans simmering in rich dark sauce. The child stirs slowly and carefully, "
             "tongue slightly out in concentration, looking very proud. Steam rises from the pot. Abuela watches with "
             "a loving smile in the background. Children's book illustration, 16:9 landscape."),
            # page 6
            ("Warm Dominican kitchen. Abuela (Dominican grandmother, silver hair bun, colorful floral apron) is at the "
             "wooden cutting board, confidently chopping vegetables fast — bell peppers, onions, tomatoes, cilantro. "
             "The Dominican child (4–5, warm brown skin, dark curly hair, small apron) watches with wide amazed eyes, "
             "standing on tiptoe to see the counter better. Colorful chopped vegetables scattered on the board. "
             "The kitchen counter full of fresh produce. Children's book illustration, 16:9 landscape."),
            # page 7
            ("Warm Dominican kitchen. Abuela (Dominican grandmother, silver hair bun, colorful floral apron) cooks at "
             "the stove, head tilted back slightly, singing with her mouth open and eyes crinkled with joy. Musical "
             "notes float in the air around her. The Dominican child (4–5, warm brown skin, dark curly hair, small "
             "apron) stands beside her, also singing enthusiastically — mouth wide open, eyes half-closed, hand on "
             "chest, trying to match Abuela's song. Both are laughing and joyful. Children's book illustration, 16:9 landscape."),
            # page 8
            ("Warm Dominican kitchen near the sink or counter. A large bowl of milky white water sits between Abuela "
             "(Dominican grandmother, silver hair bun, colorful floral apron) and the Dominican child (4–5, warm brown "
             "skin, dark curly hair, small apron). Both have their hands in the bowl of rice water, swishing rice "
             "around together. The child looks focused and helpful. Abuela's larger hands are near the child's smaller "
             "hands in the bowl. The water is cloudy white from rice starch. Children's book illustration, 16:9 landscape."),
            # page 9
            ("Warm Dominican kitchen. Abuela (Dominican grandmother, silver hair bun, colorful floral apron) and the "
             "Dominican child (4–5, warm brown skin, dark curly hair, small apron, on step stool) stand side by side "
             "in front of the stove, both looking at a covered pot of rice. Steam escapes from under the lid. Both lean "
             "in slightly, watching with fascinated expressions. The stove glows with warm orange burner light. "
             "Children's book illustration, 16:9 landscape."),
            # page 10
            ("Warm Dominican kitchen. Abuela (Dominican grandmother, silver hair bun, colorful floral apron) holds a "
             "small spoon with some red beans toward the Dominican child (4–5, warm brown skin, dark curly hair, small "
             "apron). The child leans forward to taste from the spoon with big curious eyes and open mouth. Abuela "
             "watches with a warm expectant smile, one eyebrow raised as if asking 'Well? What do you think?' "
             "The moment feels playful and trusting. Children's book illustration, 16:9 landscape."),
            # page 11
            ("Warm Dominican kitchen. The Dominican child (4–5, warm brown skin, dark curly hair, small apron) stands "
             "with a HUGE grin, one arm raised high giving a giant enthusiastic THUMBS UP. A small trace of bean sauce "
             "at the corner of the child's mouth. Eyes sparkling with delight. Abuela in the background laughs with "
             "her whole body — head thrown back, hands on her apron, totally joyful. The kitchen is full of laughter "
             "and warmth. Children's book illustration, 16:9 landscape."),
            # page 12
            ("A warm colorful Dominican dining room or kitchen table. The table is set for a big family meal — steaming "
             "bowls of rice, red beans, vegetables. A diverse joyful Dominican family gathers around the table: "
             "grandparents, parents, aunts, uncles, children. Everyone smiles, greeting each other. The Dominican child "
             "(4–5, warm brown skin, dark curly hair, small apron still on) beams with pride. Abuela carries the main "
             "pot of food proudly. The scene is warm, crowded, noisy, and deeply loving. Children's book illustration, 16:9 landscape."),
            # page 13
            ("Warm golden dining table. Abuela (Dominican grandmother, silver hair bun, now without apron, in simple "
             "housedress) sits at the head of the table, leaning close to the Dominican child (4–5, warm brown skin, "
             "dark curly hair). She speaks gently to the child with a wise loving smile, maybe touching the child's "
             "chin. The child looks up at her with total adoration. The family meal is spread before them. Family "
             "members eat happily in the background. Warm golden light. Grandmother and grandchild wisdom moment. "
             "Children's book illustration, 16:9 landscape."),
        ],
        "cover_page": 12,  # 0-indexed, page 13 (family at table)
    },

    "the-mango-tree": {
        "title": "The Mango Tree",
        "master_style": (
            "MASTER STYLE: Vibrant, warm children's book illustration in soft digital painting style. "
            "Clean outlines with rich, saturated tropical Caribbean colors — lush greens, warm mango yellows "
            "and oranges, deep blue sky, terracotta soil. Dominican family characters with warm brown skin, "
            "dark hair, expressive joyful faces. Setting is a lush Dominican yard with a magnificent mango "
            "tree and a warm Caribbean home. 16:9 landscape format. Style feels bright, clear, and full of "
            "tropical warmth and joy. Every image should feel like a sunny Caribbean afternoon full of "
            "laughter and family love."
        ),
        "pages": [
            # page 1
            ("A magnificent, large mango tree dominates the center of a lush Dominican yard. The tree is full "
             "and spreading, dark green leaves with dozens of ripe mangoes hanging in clusters — yellow, orange, "
             "and red. The yard is tropical and colorful — grass, flowering shrubs, a colorful Dominican house "
             "visible in the background. A Dominican child (5–6, warm brown skin, dark hair, colorful T-shirt and "
             "shorts) stands at the edge of the yard looking up at the tree in total wonder and delight — mouth open, "
             "eyes wide. The tree towers over the child. Warm Caribbean sunlight. Children's book illustration, 16:9 landscape."),
            # page 2
            ("Close-up view of the mango tree's branches, heavy with ripe mangoes in rich yellow, orange, and red "
             "colors. Several mangoes hang in a beautiful cluster. The Dominican child (5–6, warm brown skin, dark hair) "
             "stands below looking up with sparkling eyes, reaching one hand upward toward the mangoes. Light filters "
             "through the leaves, dappling the mangoes in warm sunlight. Each mango is plump, ripe, and gorgeous. "
             "Vivid warm mango colors. Children's book illustration, 16:9 landscape."),
            # page 3
            ("The Dominican child (5–6, warm brown skin, dark hair) stands under the big mango tree with eyes closed "
             "and a blissful smile, nose tilted up toward the branches. Gentle curvy scent lines or small sparkles "
             "drift down from the mangoes above to show the wonderful smell. Ripe yellow-orange mangoes hang "
             "tantalizingly overhead. Sun shines through the tree leaves in warm dappled light. Children's book illustration, 16:9 landscape."),
            # page 4
            ("The Dominican child (5–6, warm brown skin, dark hair) stands on tiptoe under the mango tree, arms "
             "stretched as high as possible, fingers straining upward. The nearest ripe yellow-orange mangoes are "
             "just out of reach, dangling tantalizingly above. The child's face shows determined effort and frustrated "
             "disappointment. The gap between the child's fingers and the mangoes is comically just-too-far. "
             "Children's book illustration, 16:9 landscape."),
            # page 5
            ("The Dominican child (5–6, warm brown skin, dark hair) stands near the mango tree, hands cupped around "
             "mouth, calling out toward the house. In the distance, Papa (tall Dominican man, 30s, warm brown skin, "
             "short dark hair, casual T-shirt and jeans) appears in the doorway or yard, looking over with a warm "
             "curious smile. The child's posture is urgent and excited. Children's book illustration, 16:9 landscape."),
            # page 6
            ("Papa (tall Dominican man, 30s, warm brown skin, casual T-shirt) lifts the Dominican child (5–6, warm "
             "brown skin, dark hair) up HIGH into the mango tree with strong gentle arms. The child is UP in the air "
             "among the branches, leaves, and mangoes, laughing with total delight, arms slightly out for balance. "
             "Papa looks up with a big grin. Mangoes hang all around the child now. Children's book illustration, 16:9 landscape."),
            # page 7
            ("The Dominican child (5–6, warm brown skin, dark hair) is UP in the mango tree, both hands wrapped "
             "around a big beautiful ripe yellow mango, pulling it from the branch. The child's face shows pure triumph "
             "and delight — eyes sparkling, big grin. Papa's hands are visible below supporting the child. The mango "
             "is huge, bright yellow-orange, and gorgeous. Other mangoes hang nearby. Triumphant moment. "
             "Children's book illustration, 16:9 landscape."),
            # page 8
            ("Papa (Dominican man, 30s) and the child (5–6, warm brown skin, dark hair) work together under and in "
             "the mango tree, picking mangoes and dropping them into a large woven or cloth bag on the ground. Several "
             "mangoes already in the bag — yellow, orange, red. Both are smiling and working happily together. The bag "
             "is getting full and heavy with beautiful ripe mangoes. Children's book illustration, 16:9 landscape."),
            # page 9
            ("Warm kitchen or outdoor table. Mama (Dominican woman, 30s, warm brown skin, dark hair, colorful blouse) "
             "stands at a table cutting ripe mangoes with skilled hands — scoring the mango flesh into cubes, turning "
             "it out to make a beautiful golden mango flower or serving slices. Several cut mangoes already on a plate, "
             "golden and glistening. The child (5–6, warm brown skin, dark hair) and younger sister both stand nearby "
             "watching with wide hungry eyes and drooling smiles. Children's book illustration, 16:9 landscape."),
            # page 10
            ("The Dominican child (5–6, warm brown skin, dark hair) and younger sister sit across from each other at "
             "a simple table, both eating mango pieces with total joy. They hold mango slices in both hands, juice "
             "already on their faces and hands. A plate of cut mangoes sits between them. Their faces show pure bliss — "
             "closed eyes, huge smiles, completely lost in how delicious the mango is. Warm Caribbean afternoon light. "
             "Children's book illustration, 16:9 landscape."),
            # page 11
            ("The Dominican child (5–6, warm brown skin) and younger sister both have mango juice running down their "
             "chins, onto their hands, dripping everywhere — and they find it absolutely HILARIOUS. Both are laughing "
             "hard — mouths wide open, eyes crinkled, heads thrown back. Golden mango juice drips visibly. They look "
             "at each other's messy faces and laugh even harder. Pure uncontrollable childhood laughter. "
             "Children's book illustration, 16:9 landscape."),
            # page 12
            ("The Dominican child (5–6, warm brown skin, dark hair) stands happily in front of the big mango tree in "
             "the yard, holding a ripe yellow mango up like a trophy, grinning at the viewer. The magnificent mango "
             "tree is full of mangoes behind them. Papa, Mama, and the younger sister are nearby — all smiling and "
             "relaxed, happy together in the warm afternoon. Golden warm contented scene. Perfect memory of a perfect "
             "afternoon. Children's book illustration, 16:9 landscape."),
        ],
        "cover_page": 0,
    },

    "tito-the-baby-turtle": {
        "title": "Tito the Baby Turtle",
        "master_style": (
            "MASTER STYLE: Vibrant, warm children's book illustration in soft digital painting style. "
            "Clean outlines with brilliant Caribbean colors — turquoise and deep blue ocean, brilliant "
            "white and gold sand, vivid tropical sky, lush greens. Tito the baby sea turtle has big "
            "expressive eyes, a small round green-olive shell, and tiny cute flippers. The beach setting "
            "is a gorgeous Dominican/Caribbean coast. 16:9 landscape format. Style feels bright, clear, "
            "and full of tropical wonder. Every image should feel like a perfect sunny beach day, full of "
            "adventure and discovery for a tiny brave turtle."
        ),
        "pages": [
            # page 1
            ("A gorgeous Caribbean beach — pale gold sand, brilliant turquoise water, bright blue sky, a few palm "
             "trees in the background. In the center of the sandy beach sits Tito — a tiny adorable baby sea turtle "
             "with big dark expressive eyes, a small round green-olive shell, and four little flippers. He sits on "
             "the warm sand looking around curiously and a little unsure. He is very small — emphasize his smallness "
             "against the wide beautiful beach. Warm, bright, beautiful. Children's book illustration, 16:9 landscape."),
            # page 2
            ("Tito (tiny baby sea turtle, big dark eyes, small round green shell, four little flippers) sits on the "
             "golden sand, looking out toward the ocean. The view shows what he sees — the vast glittering turquoise "
             "and blue Caribbean ocean stretching to the horizon, with gentle waves rolling in. The ocean looks "
             "enormous compared to little Tito. His expression is wide-eyed wonder — a little intimidated, a little "
             "enchanted. Water crystal clear, turquoise near shore fading to deep blue. Children's book illustration, 16:9 landscape."),
            # page 3
            ("The shoreline of a beautiful Caribbean beach. A gentle wave rolls in toward the shore in a smooth clear "
             "curve — bright turquoise water through the wave face. The wave reaches the sand, spreads out as white "
             "foam, then the water pulls back leaving dark wet sand. Tito (tiny baby sea turtle, big dark eyes, small "
             "round green shell) watches from the dry sand nearby, head tilting to follow the wave in and then back "
             "out, clearly fascinated. Children's book illustration, 16:9 landscape."),
            # page 4
            ("Tito (tiny baby sea turtle, big dark eyes, small round green shell) walks slowly and carefully across "
             "the wet sand toward the water's edge. He takes small careful steps with his four little flippers. The "
             "waves have retreated and the sand ahead is dark and wet. The turquoise ocean is just ahead. Tito's "
             "expression is brave but cautious — determined, taking it one step at a time. His flipper prints trail "
             "behind him in the sand. Children's book illustration, 16:9 landscape."),
            # page 5
            ("Close-up at the water's edge. Tito (tiny baby sea turtle, big dark expressive eyes, small round green "
             "shell) stands at the very edge of the Caribbean water. He carefully extends ONE tiny front flipper into "
             "the shallow crystal-clear water — just dipping it in. The water is perfectly clear, sandy bottom visible. "
             "Tito's face shows a mix of surprise and delight at the cool feeling. Small ripples spread from where his "
             "flipper touches the water. Half on sand, half leaning toward water. Children's book illustration, 16:9 landscape."),
            # page 6
            ("At the shallow water's edge. Tito (tiny baby sea turtle, big dark eyes, small green shell) stands at "
             "the shoreline when a small bright tropical fish (orange and white stripes, or blue and yellow) swims "
             "right up to Tito in the shallow clear water. The fish has a big friendly smile and looks directly at "
             "Tito with a happy expression. Tito's eyes are WIDE with happy surprise — a new friend! Water is crystal "
             "clear with sandy bottom visible. Magical and encouraging moment. Children's book illustration, 16:9 landscape."),
            # page 7
            ("Tito (tiny baby sea turtle, big dark eyes, small round green shell) wades INTO the water — up to his "
             "middle, wading into the Caribbean shallows. Expression shows determination and courage — cheeks puffed "
             "slightly as if holding a big breath, eyes focused ahead. Crystal-clear turquoise water around him, "
             "gently lapping. Sandy bottom visible below. Going DEEPER, one brave step at a time. Sunlight makes "
             "the water shimmer beautifully. Children's book illustration, 16:9 landscape."),
            # page 8
            ("Tito (tiny baby sea turtle, big dark eyes, small round green shell) is SWIMMING! His four little "
             "flippers kick and paddle through the clear turquoise Caribbean water. Face shows PURE JOY — wide eyes "
             "sparkling, big smile. Motion lines or small bubbles trail from his flippers to show movement. Beautiful "
             "turquoise water, sun streaming from above making golden patterns. The DISCOVERY PAGE — Tito can swim! "
             "Children's book illustration, 16:9 landscape."),
            # page 9
            ("Tito (tiny baby sea turtle, big dark eyes, small round green shell) floats or swims in the beautiful "
             "turquoise Caribbean water. His eyes are half-closed in bliss, a peaceful and deeply contented expression. "
             "The water is crystalline with beautiful light patterns filtering down. Small colorful fish swim nearby. "
             "Serene, peaceful, deeply happy. Tito has found his home element. Cool, clear, and perfect. "
             "Children's book illustration, 16:9 landscape."),
            # page 10
            ("Tito (tiny baby sea turtle, big dark eyes, small round green shell) is swimming when suddenly a BIG "
             "wave looms up ahead — huge compared to little Tito, curling and rolling forward fast. Tito's eyes go "
             "WIDE with surprise and slight alarm, also a hint of excitement. The wave is impressive but not terrifying "
             "— a big beautiful wave curling toward him. Turquoise water churns with energy. Tito looks tiny and brave "
             "against the oncoming wave. Children's book illustration, 16:9 landscape."),
            # page 11
            ("Tito (tiny baby sea turtle, big dark eyes, small round green shell) rides the crest of the big wave, "
             "flippers spread out like he's flying, being carried fast toward the shore on top of the white churning "
             "wave. His face shows ABSOLUTE DELIGHT — laughing, thrilled, arms spread wide. The wave crests around "
             "him in beautiful white foam and turquoise water. Beach and palm trees visible ahead getting closer fast. "
             "Tito SURFING! Pure joy and excitement. Children's book illustration, 16:9 landscape."),
            # page 12
            ("A beautiful Caribbean beach and ocean scene. Tito (tiny baby sea turtle, big dark eyes, small round "
             "green shell) swims confidently and happily through the clear turquoise water near a colorful reef or "
             "in the bright shallows, surrounded by small friendly tropical fish. Completely at home — swimming with "
             "easy confident flipper strokes, big happy smile, eyes sparkling. Gorgeous ocean around him — turquoise, "
             "clear, with sunlight patterns. Beach visible in background, warm and bright. THIS IS TITO'S HAPPY PLACE. "
             "Children's book illustration, 16:9 landscape."),
        ],
        "cover_page": 0,
    },

    "the-big-storm": {
        "title": "The Big Storm",
        "master_style": (
            "MASTER STYLE: Vibrant, warm children's book illustration in soft digital painting style. "
            "Clean outlines with rich Caribbean colors. Dominican family characters with warm brown skin, "
            "dark curly hair, expressive faces. Setting is a colorful Dominican home and Caribbean landscape "
            "with tall green mountains. 16:9 landscape format. The story has a dramatic storm arc — early "
            "pages are bright Caribbean daylight, storm pages are dramatically lit with dark blues and grays "
            "(but still warm inside the home), and the final pages burst into brilliant sunshine and rainbow. "
            "Every image should feel emotionally clear and child-friendly, even the dramatic storm pages."
        ),
        "pages": [
            # page 1
            ("Wide view of a lush Dominican Caribbean landscape — tall green mountains in the background, colorful "
             "neighborhood in the foreground. Dramatic sky: on one side, dark gray-purple storm clouds rolling in "
             "over the mountains. The other part of the sky is still bright blue. Contrast between dark storm clouds "
             "and lush green mountains is striking. A Dominican child (4–5, warm brown skin, dark curly hair) may "
             "be visible playing outside, looking up at the sky. Children's book illustration, 16:9 landscape."),
            # page 2
            ("Outdoors, Dominican yard. Papa (Dominican man, 30s, warm brown skin, short dark hair, casual T-shirt) "
             "stands outside looking up at darkening sky with calm knowing expression. Dark storm clouds much closer "
             "and more ominous overhead. The Dominican child (4–5, warm brown skin, dark curly hair) stands beside "
             "Papa looking up too, eyes wide. Papa points at the sky. Despite dark clouds, Papa's calm expression "
             "reassures. Children's book illustration, 16:9 landscape."),
            # page 3
            ("Papa (Dominican man, 30s), Mama (Dominican woman, 30s, warm brown skin, dark hair), and the Dominican "
             "child (4–5, warm brown skin, dark curly hair) all running fast toward their colorful front door. The "
             "child runs with little legs pumping, slightly scared. A small family dog runs alongside. Dark storm "
             "clouds are very close and wind has picked up — leaves blowing. The door is open and welcoming. "
             "Fun urgent scramble before the storm. Children's book illustration, 16:9 landscape."),
            # page 4
            ("Interior of colorful Dominican home. Mama (Dominican woman, 30s, warm brown skin, dark hair) closes "
             "window shutters as storm darkens outside — windows show darkening storm sky. The Dominican child "
             "(4–5, warm brown skin, dark curly hair) watches Mama. On a nearby table, a soft candle is lit, "
             "casting warm orange-yellow glow. Outside: gray and ominous. Inside: warm candlelight, safe and cozy. "
             "Strong contrast warm inside vs dark outside. Children's book illustration, 16:9 landscape."),
            # page 5
            ("Interior of Dominican home, dimly lit by candle and storm-dark windows. BOOM — a flash of lightning "
             "outside. The little dog (scruffy mixed-breed, tan or brown) has dived under the nearest bed or couch "
             "with just its nose and big scared eyes visible, tail tucked under. The Dominican child watches the dog "
             "with sympathy and amusement. Storm visible outside through the window. Children's book illustration, 16:9 landscape."),
            # page 6
            ("The Dominican child (4–5, warm brown skin, dark curly hair) stands at the window of the house, looking "
             "out at the sky. Through the window, a brilliant bolt of lightning flashes across the entire dark storm "
             "sky in brilliant white-blue light. Dark storm clouds are dramatic and massive. Lightning bolt is vivid "
             "and electric. The child watches with wide awestruck eyes — amazed, not terrified. The room behind is "
             "warm and safe with candlelight. Children's book illustration, 16:9 landscape."),
            # page 7
            ("Warm candlelit interior of Dominican home. Mama (Dominican woman, 30s, warm brown skin, dark hair) "
             "sits on the couch, holding the Dominican child (4–5, warm brown skin, dark curly hair) in a warm tight "
             "hug. The child is tucked into Mama's arms, looking a little scared but comforted — face pressing into "
             "Mama's shoulder. Mama wraps her arms around the child completely, face showing total love and protection. "
             "Candle glows nearby. Outside: still stormy. Inside: this hug is everything — safe and warm. "
             "Children's book illustration, 16:9 landscape."),
            # page 8
            ("Cozy interior, candlelit. Papa (Dominican man, 30s, warm brown skin, casual T-shirt) sits with the "
             "Dominican child and maybe Mama on the couch, speaking gently and wisely. Papa gestures toward the "
             "window where rain falls, or makes an explaining gesture. The child looks up at Papa with interested "
             "trusting eyes — calmer now. Papa's expression is warm, patient, and wise. Storm still visible outside "
             "but feels less threatening. Children's book illustration, 16:9 landscape."),
            # page 9
            ("Wide view of the colorful Dominican house in the full storm — heavy rain falls in curtains, drumming "
             "on the roof. The house is cozy and warm inside (warm yellow light visible through the window). Outside, "
             "rain pours straight down hard, making patterns in puddles on the ground. Roofline with rain hammering "
             "down on the metal roof — sheets of water. Storm is intense outside. Children's book illustration, 16:9 landscape."),
            # page 10
            ("The coziest interior scene. The whole family on the couch: Papa (Dominican man, 30s) reads a colorful "
             "storybook aloud to the Dominican child (4–5, warm brown skin, dark curly hair) and Mama, snuggled up "
             "on either side of him. Candle glows warmly. The dog has emerged from under the bed and sleeps curled "
             "at their feet. Papa reads with expression — mid-funny-voice, mouth open. Child laughs. Mama smiles. "
             "Outside, rain still falls on the window. Inside: pure family coziness. Children's book illustration, 16:9 landscape."),
            # page 11
            ("The Dominican home. The storm has eased — outside the windows, rain has softened to gentle drizzle or "
             "stopped. Dark storm clouds breaking up slightly, sky beginning to lighten. Inside, the family is "
             "peaceful and slightly drowsy. The Dominican child looks toward the window, noticing the quiet. Room "
             "is still warm with candle glow but lighter than before. Stillness in the air — storm has passed. "
             "Everything peaceful and hushed. Children's book illustration, 16:9 landscape."),
            # page 12
            ("The Dominican child (4–5, warm brown skin, dark curly hair) and Papa press their faces close to the "
             "window, looking out with big excited smiles. Through the window, storm clouds are clearing and brilliant "
             "golden-white sunlight breaks through — rays of light streaming between clouds onto the wet green "
             "landscape. Light is gorgeous and dramatic after the storm's darkness. The child's eyes are wide with "
             "delight. Papa grins. Outside looks washed clean and newly brilliant. Children's book illustration, 16:9 landscape."),
            # page 13
            ("SPECTACULAR rainbow scene. The Dominican child (4–5, warm brown skin, dark curly hair), Papa, and Mama "
             "look out the window or are just stepping outside, pointing up at a MAGNIFICENT full rainbow arching "
             "across the entire sky. The rainbow is vivid and complete — red, orange, yellow, green, blue, indigo, "
             "violet — stretching from one side of the scene to the other over the wet green landscape and mountains. "
             "Everything is fresh and glistening. The family's faces show pure awe and delight. Sky is half-clearing "
             "with golden light. Children's book illustration, 16:9 landscape."),
            # page 14
            ("The Dominican child (4–5, warm brown skin, dark curly hair), Papa, and Mama burst out of their colorful "
             "front door into the fresh post-storm world. The child runs ahead with arms wide open, face turned up to "
             "the sky, completely joyful. Papa and Mama follow, also smiling big. The little dog runs alongside. "
             "Everything outside is fresh and glistening — wet leaves sparkling, rainbow still visible in the sky, "
             "golden sunlight. Flowers in the yard look fresh and bright after the rain. Children's book illustration, 16:9 landscape."),
        ],
        "cover_page": 0,
    },

    "jesus-feeds-five-thousand": {
        "title": "Jesus Feeds the Five Thousand",
        "master_style": (
            "MASTER STYLE: Warm, vibrant children's book illustration in soft digital painting style. "
            "Clean outlines with rich warm colors — Mediterranean greens, dusty gold sand, warm browns "
            "and creams, beautiful blue sky and water. Characters wear simple ancient Middle Eastern "
            "clothing in earth tones, blues, and creams. Jesus is a kind tall man with warm olive skin, "
            "shoulder-length dark brown hair, short beard, in white robes. Setting is ancient Biblical "
            "landscape — grassy hillsides, blue sky, Sea of Galilee. 16:9 landscape format. The style "
            "is warm, reverent, and joyful — appropriate for preschool children. Every image should "
            "feel warm, loving, and full of wonder."
        ),
        "pages": [
            # page 1
            ("A vast gently rolling grassy hillside in ancient Israel. Thousands of people — men, women, children — "
             "in ancient Middle Eastern clothing (earth tones, blues, creams) streaming toward the hillside, following "
             "Jesus. Jesus (tall, warm olive skin, shoulder-length dark brown hair, short beard, white robes with blue "
             "cloak) walks ahead on the hillside, looking back with a welcoming smile. The crowd is enormous and "
             "joyful — people of all ages. Beautiful blue sky, green grass, distant hills. Children's book illustration, 16:9 landscape."),
            # page 2
            ("The vast grassy hillside. Thousands of people sit in the grass — families together, children in laps, "
             "everyone facing Jesus. Jesus stands at the center front, speaking with arms open in welcoming gesture, "
             "face warm and animated. The crowd listens with rapt attention — people lean forward, children are wide-eyed, "
             "adults nod. Bright blue midday sky. Children's book illustration, 16:9 landscape."),
            # page 3
            ("Late afternoon, sun lower in the sky — warm golden light. The crowd on the hillside is still there. Jesus "
             "stands with several disciples (men in simple robes) gathered around him in a small group. One or two "
             "disciples speak to Jesus with worried concerned expressions and gestures toward the hungry crowd. People "
             "in the crowd hold empty bowls or look tired and hungry. Golden afternoon light. Children's book illustration, 16:9 landscape."),
            # page 4
            ("A disciple (Andrew — older, bearded, simple robe) kneels down to talk to a little boy (7–8, Middle "
             "Eastern child, warm olive skin, dark hair, simple tunic). The boy holds a small woven basket containing "
             "five small round bread loaves. The boy's expression is open, generous, and slightly shy. Andrew looks at "
             "the loaves with surprise. They are among the seated crowd on the hillside. Children's book illustration, 16:9 landscape."),
            # page 5
            ("Close-up view of the little boy (7–8, Middle Eastern child, warm olive skin, dark hair, simple tunic) "
             "holding his small woven basket. Inside the basket, beside the five small round bread loaves, are two "
             "small silver fish — modest and humble. The boy holds the basket up slightly, showing both the bread and "
             "fish. His expression is generous and sincere. Late afternoon golden light on the basket. "
             "Children's book illustration, 16:9 landscape."),
            # page 6
            ("Jesus (tall, white robes, kind warm expression, olive skin) kneels or bends down to receive the basket "
             "from the little boy (7–8, Middle Eastern child, simple tunic). The boy holds out the basket to Jesus "
             "with a big generous smile — freely giving everything he has. Jesus accepts it with both hands, looking "
             "at the boy with deep appreciation and love. Their hands touch on the basket. The moment is tender and "
             "significant. Children's book illustration, 16:9 landscape."),
            # page 7
            ("Jesus stands on the hillside, face lifted upward toward the sky with a peaceful reverent expression — "
             "eyes open or closed in prayer, hands raised slightly. He holds the bread and fish. The sky above is "
             "golden and luminous — rays of warm light. The crowd watches in hushed expectant silence behind him. "
             "Sacred and still. Golden late-afternoon light creates holy wonder. Children's book illustration, 16:9 landscape."),
            # page 8
            ("Jesus stands with his disciples gathered close around him. He breaks bread in his hands — there seems "
             "to be MORE bread than there should be. Disciples reach out to receive pieces of bread and fish from "
             "Jesus, their arms full. Their expressions range from wonder to focused urgency to disbelief. The bread "
             "seems to multiply in Jesus' hands. The light around Jesus is warm and luminous. Children's book illustration, 16:9 landscape."),
            # page 9
            ("The disciples move through the seated crowd on the hillside, distributing bread and fish to everyone — "
             "men, women, children. The crowd reaches up eagerly for food. Disciples carry baskets overflowing with "
             "bread and fish — far more than the original 5 loaves and 2 fish. People's faces show gratitude and "
             "amazement. The scene feels joyful and miraculous — everyone is being fed. Late golden afternoon light. "
             "Children's book illustration, 16:9 landscape."),
            # page 10
            ("Wide view of the entire hillside crowd, everyone eating — families sharing bread and fish, children "
             "eating happily, adults passing food to each other. The scene is joyful, warm, and communal. Everyone "
             "has food. The crowd is enormous. Jesus stands at the edge watching with a peaceful loving smile. "
             "The golden late-afternoon light bathes the whole scene in warmth. Children's book illustration, 16:9 landscape."),
            # page 11
            ("Close-up view of a small group — a man, a woman, and a child — sitting together on the grass, eating "
             "contentedly. Full, satisfied, peaceful faces. Bread and fish in their hands. Other families visible "
             "around them, equally satisfied. The child's face shows pure contentment — belly full, eyes happy. "
             "Warm gold-orange evening light. Children's book illustration, 16:9 landscape."),
            # page 12
            ("After the meal, the disciples walk across the hillside picking up leftover food. They've filled TWELVE "
             "large baskets, overflowing with bread and fish. The baskets are enormous and clearly very full. Disciples "
             "look amazed as they pile up more and more leftover food — so much more than the original 5 loaves and "
             "2 fish. Some disciples count baskets with wide eyes. Jesus watches with a gentle knowing smile. "
             "Children's book illustration, 16:9 landscape."),
            # page 13
            ("The little boy (7–8, Middle Eastern child, warm olive skin, dark hair, simple tunic) stands on the "
             "hillside with the biggest most joyful smile. He looks out at the crowd — thousands of satisfied happy "
             "people around him. Behind him, the twelve full baskets of leftovers are visible. The boy's expression "
             "is pure wonder and joy — his small gift of 5 loaves and 2 fish fed all these thousands of people! "
             "Jesus watches him from the side with a warm approving smile. Children's book illustration, 16:9 landscape."),
            # page 14
            ("Beautiful luminous closing scene. Jesus stands on the hillside at golden sunset, crowd dispersing "
             "happily around him — families walking home satisfied, children running, people waving. The little boy "
             "stands beside Jesus, looking up at him. Jesus rests a gentle hand on the boy's shoulder. The sky is "
             "golden and gorgeous. The twelve baskets are visible nearby. Everything feels warm, beautiful, and full "
             "of wonder. A visual benediction — warm, golden, deeply hopeful. Children's book illustration, 16:9 landscape."),
        ],
        "cover_page": 0,
    },

    "jesus-heals-the-lame-man": {
        "title": "Jesus Heals the Man Who Could Not Walk",
        "master_style": (
            "MASTER STYLE: Warm, vibrant children's book illustration in soft digital painting style. "
            "Clean outlines with rich warm colors — warm stone beige, Mediterranean sky blue, earth "
            "tones, touches of bright color in clothing. Ancient Middle Eastern setting — stone houses, "
            "dusty streets, flat rooftops. Characters wear simple ancient robes in creams, blues, and "
            "earth tones. Jesus is kind and tall in white robes with warm olive skin and dark hair. "
            "16:9 landscape format. Style is warm, reverent, and joyful — appropriate for preschool "
            "children. The miracle moment should feel luminous and filled with wonder."
        ),
        "pages": [
            # page 1
            ("Interior of an ancient stone house, absolutely packed with people. Jesus (tall, white robes, dark "
             "shoulder-length hair, short beard, kind face, warm olive skin) stands in the center, speaking and "
             "teaching. People are seated on the floor, standing along the walls, leaning in from every direction. "
             "Light comes from oil lamps and windows. Stone walls, simple wooden furniture. People outside visible "
             "through the doorway. Energy is warm and intent. Children's book illustration, 16:9 landscape."),
            # page 2
            ("An ancient Middle Eastern street outside a packed stone house. Four young men (Middle Eastern features, "
             "simple robes in various earth tones) huddle together, clearly on a mission. They speak urgently with "
             "determined expressions — they will get their friend to Jesus. One gestures toward the house and its "
             "crowd. Their faces show deep love for their friend and strong determination. The crowded house is visible "
             "in the background. Children's book illustration, 16:9 landscape."),
            # page 3
            ("Outdoor scene. The four friends (young men, simple robes) carefully carry their paralyzed friend on a "
             "simple woven mat — one at each corner, moving together with effort and care. The paralyzed man lies on "
             "the mat, looking up at his friends with gratitude and hope. The four friends look focused, strong, and "
             "loving — this is hard work but they do it with joy. Moving toward the packed house in the background. "
             "Children's book illustration, 16:9 landscape."),
            # page 4
            ("The four friends carrying their paralyzed friend on the mat have arrived at the front of the packed "
             "stone house. But the doorway is completely blocked by people — a dense crowd fills the entrance, "
             "shoulder to shoulder, no way through. The four friends look frustrated and disappointed. The paralyzed "
             "man on the mat looks worried. People in the crowd don't notice them. The friends look at each other — "
             "there must be another way. Children's book illustration, 16:9 landscape."),
            # page 5
            ("The outside of the ancient stone house. The four friends are CLIMBING to the flat roof! One is already "
             "on the roof, reaching down to help the next up. They carry the mat with their friend — two friends "
             "ahead pulling the mat from above while two push from below. Everyone strains with effort and "
             "determination, but also excitement — they have a GREAT IDEA! The flat roof visible at the top. "
             "Children's book illustration, 16:9 landscape."),
            # page 6
            ("On the flat roof, the four friends dig and pull back the roof material to create a hole. Below, through "
             "the hole into the crowded house, the crowd looks up in amazement as the mat with the paralyzed man "
             "slowly descends through the hole on ropes held by the four friends on the roof. The paralyzed man "
             "descends with nervous anticipation and hope. The crowd below parts and stares upward. "
             "Children's book illustration, 16:9 landscape."),
            # page 7
            ("Inside the house. Jesus looks up through the hole in the roof where the paralyzed man on the mat is "
             "being lowered down. Above, the four friends peer down through the hole. Jesus' face shows deep moved "
             "admiration — he can see the love these friends have. Expression is warm, touched, and full of compassion. "
             "Light filters down through the roof hole around the descending man, creating a beautiful almost heavenly "
             "quality. Children's book illustration, 16:9 landscape."),
            # page 8
            ("Inside the house. Jesus (tall, white robes, warm olive skin, kind dark eyes) stands before the paralyzed "
             "man who lies on the mat on the floor. Jesus smiles gently and speaks directly to the man — posture is "
             "confident and full of compassion. He may reach down a hand toward the man. The man on the mat looks up "
             "at Jesus with wonder, fear, and dawning hope — something is happening. The crowd watches with bated "
             "breath. Light glows around Jesus. Children's book illustration, 16:9 landscape."),
            # page 9
            ("The paralyzed man is still on the mat but something miraculous is happening — his face shows a dramatic "
             "overwhelming change: eyes wide, mouth open in shock and joy, hands pressed to his legs. Visible energy "
             "or warm light flows through his legs — golden glow or warm lines of power running through his previously "
             "limp legs. His legs seem to be awakening. Jesus watches with calm knowing peace. The crowd leans forward. "
             "Children's book illustration, 16:9 landscape."),
            # page 10
            ("The formerly paralyzed man STANDS UP — strong, upright, completely healed. He holds his rolled-up mat "
             "in one arm. His face is pure JOY and amazement — he's walking! The crowd parts in front of him, mouths "
             "open, eyes wide in disbelief and wonder. He walks toward the door. Jesus watches with a peaceful joyful "
             "smile. The man's posture is strong and upright — fully healed and confident. Children's book illustration, 16:9 landscape."),
            # page 11
            ("The healed man walks through the crowd toward the doorway. The crowd parts in front of him in awe — "
             "people step back, mouths open, eyes wide. Some cover their mouths in amazement, some raise hands in "
             "praise. The healed man walks tall through the parting crowd, mat tucked under his arm, face shining "
             "with joy. Jesus visible at the back of the scene. The crowd's collective astonishment creates a corridor "
             "for the healed man to walk through. Children's book illustration, 16:9 landscape."),
            # page 12
            ("Outside the house. The healed man emerges from the doorway into the sunlight, walking tall and strong. "
             "The four friends are RIGHT THERE waiting — and when they see their friend WALKING, they completely lose "
             "it in joy. They leap, cheer, embrace their friend — arms in the air, jumping, laughing, crying happy "
             "tears, hugging each other and him. The healed man embraces each friend. Overwhelming joy and love — "
             "the best moment of their lives. Children's book illustration, 16:9 landscape."),
            # page 13
            ("Beautiful luminous closing scene. Wide view outside and around the house — the healed man stands strong "
             "with his friends, arms raised in praise. The crowd around them also lifts hands and faces toward heaven "
             "in worship and wonder. Jesus watches peacefully from nearby. The sky above is bright and luminous — "
             "warm golden light. People's faces show awe, wonder, joy, and praise. Collective worship and wonder, "
             "gratitude rising naturally. Children's book illustration, 16:9 landscape."),
        ],
        "cover_page": 0,
    },
}


# ─── GENERATION LOGIC ─────────────────────────────────────────────────────────

def generate_image(client, prompt: str, output_path: Path, retries: int = 3) -> bool:
    from google.genai import types

    for attempt in range(retries):
        try:
            print(f"  Generating (attempt {attempt + 1})...")
            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                    image_config=types.ImageConfig(
                        image_size=RESOLUTION,
                        aspect_ratio=ASPECT_RATIO,
                    )
                )
            )

            for part in response.parts:
                if part.inline_data is not None:
                    from PIL import Image as PILImage

                    image_data = part.inline_data.data
                    if isinstance(image_data, str):
                        import base64
                        image_data = base64.b64decode(image_data)

                    image = PILImage.open(BytesIO(image_data))
                    if image.mode != 'RGB':
                        image = image.convert('RGB')

                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    image.save(str(output_path), 'WEBP', quality=85)
                    print(f"  Saved: {output_path}")
                    return True

            print(f"  Warning: No image in response on attempt {attempt + 1}")

        except Exception as e:
            print(f"  Error on attempt {attempt + 1}: {e}")
            if attempt < retries - 1:
                wait = 10 * (attempt + 1)
                print(f"  Waiting {wait}s before retry...")
                time.sleep(wait)

    return False


def process_book(book_id: str, specific_page: int | None = None, skip_existing: bool = False):
    if book_id not in BOOKS:
        print(f"ERROR: Unknown book '{book_id}'")
        print(f"Available: {', '.join(BOOKS.keys())}")
        return False

    book = BOOKS[book_id]
    story_dir = STORIES_DIR / book_id
    story_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"Book: {book['title']} ({book_id})")
    print(f"Pages: {len(book['pages'])}")
    print(f"{'='*60}")

    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)

    success_count = 0
    fail_count = 0

    pages_to_process = range(len(book['pages']))
    if specific_page is not None:
        pages_to_process = [specific_page - 1]  # convert 1-indexed to 0-indexed

    for i in pages_to_process:
        page_num = i + 1
        filename = f"page-{page_num:02d}.webp"
        output_path = story_dir / filename

        if skip_existing and output_path.exists():
            print(f"\nPage {page_num}: Skipping (already exists)")
            success_count += 1
            continue

        print(f"\nPage {page_num}/{len(book['pages'])}: {filename}")

        full_prompt = f"{book['master_style']}\n\n{book['pages'][i]}"

        ok = generate_image(client, full_prompt, output_path)
        if ok:
            success_count += 1
            # Create cover.jpg from the designated cover page
            if i == book['cover_page']:
                cover_path = story_dir / "cover.jpg"
                from PIL import Image as PILImage
                img = PILImage.open(str(output_path))
                img.save(str(cover_path), 'JPEG', quality=90)
                print(f"  Also saved as cover.jpg")
        else:
            fail_count += 1

        # Brief pause between requests to be kind to the API
        if i < len(book['pages']) - 1 and specific_page is None:
            time.sleep(3)

    print(f"\n{book['title']}: {success_count} generated, {fail_count} failed")
    return fail_count == 0


def main():
    parser = argparse.ArgumentParser(description="Generate ReadAloud story illustrations via Gemini")
    parser.add_argument("book", nargs="?", help="Book ID to generate (e.g. the-mango-tree)")
    parser.add_argument("--page", type=int, help="Generate only this page number (1-indexed)")
    parser.add_argument("--skip-existing", action="store_true", help="Skip pages that already have images")
    parser.add_argument("--all", action="store_true", help="Generate all books")
    parser.add_argument("--list", action="store_true", help="List available books")

    args = parser.parse_args()

    if args.list:
        print("Available books:")
        for book_id, book in BOOKS.items():
            print(f"  {book_id}: {book['title']} ({len(book['pages'])} pages)")
        return

    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY not set")
        sys.exit(1)

    if args.all:
        total_ok = 0
        total_fail = 0
        for book_id in BOOKS:
            ok = process_book(book_id, skip_existing=args.skip_existing)
            if ok:
                total_ok += 1
            else:
                total_fail += 1
        print(f"\n{'='*60}")
        print(f"ALL DONE: {total_ok} books complete, {total_fail} books had failures")
    elif args.book:
        process_book(args.book, specific_page=args.page, skip_existing=args.skip_existing)
    else:
        parser.print_help()
        print("\nAvailable books:")
        for book_id, book in BOOKS.items():
            print(f"  {book_id}: {book['title']} ({len(book['pages'])} pages)")


if __name__ == "__main__":
    main()
