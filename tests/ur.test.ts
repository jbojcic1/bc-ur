import UREncoder from "../src/urEncoder";
import URDecoder from "../src/urDecoder";
import { makeMessageUR } from "./utils";
import UR from "../src/ur";
import { describe, test, expect } from "vitest";


describe('UR', () => {
  test('encode/decode single part ur', () => {
    const message = makeMessageUR(50);
    const encoded = UREncoder.encodeSinglePart(message);
    const expected = "ur:bytes/hdeymejtswhhylkepmykhhtsytsnoyoyaxaedsuttydmmhhpktpmsrjtgwdpfnsboxgwlbaawzuefywkdplrsrjynbvygabwjldapfcsdwkbrkch";

    expect(encoded).toBe(expected);

    const decoded = URDecoder.decode(encoded);

    expect(decoded.equals(message)).toBe(true);
  });

  test('encode/decode multi part ur', () => {
    const message = makeMessageUR(32767);
    const maxFragmentLength = 1000;
    const firstSeqNum = 100;
    const encoder = new UREncoder(message, maxFragmentLength, firstSeqNum);
    const decoder = new URDecoder();

    do {
      const part = encoder.nextPart();
      decoder.receivePart(part);
    } while (!decoder.isComplete())

    if (decoder.isSuccess()) {
      expect(decoder.resultUR().equals(message)).toBe(true);
    }
    else {
      console.log('decoder.resultError()', decoder.resultError());
      expect(false);
    }
  });

  describe('UR Encoder', () => {
    test('encoder test', () => {
      const message = makeMessageUR(256);
      const encoder = new UREncoder(message, 30)
      const parts = [...new Array(20)].map(() => encoder.nextPart())
      const expectedParts = [
        "ur:bytes/1-9/lpadascfadaxcywenbpljkhdcahkadaemejtswhhylkepmykhhtsytsnoyoyaxaedsuttydmmhhpktpmsrjtdkgslpgh",
        "ur:bytes/2-9/lpaoascfadaxcywenbpljkhdcagwdpfnsboxgwlbaawzuefywkdplrsrjynbvygabwjldapfcsgmghhkhstlrdcxaefz",
        "ur:bytes/3-9/lpaxascfadaxcywenbpljkhdcahelbknlkuejnbadmssfhfrdpsbiegecpasvssovlgeykssjykklronvsjksopdzmol",
        "ur:bytes/4-9/lpaaascfadaxcywenbpljkhdcasotkhemthydawydtaxneurlkosgwcekonertkbrlwmplssjtammdplolsbrdzcrtas",
        "ur:bytes/5-9/lpahascfadaxcywenbpljkhdcatbbdfmssrkzmcwnezelennjpfzbgmuktrhtejscktelgfpdlrkfyfwdajldejokbwf",
        "ur:bytes/6-9/lpamascfadaxcywenbpljkhdcackjlhkhybssklbwefectpfnbbectrljectpavyrolkzczcpkmwidmwoxkilghdsowp",
        "ur:bytes/7-9/lpatascfadaxcywenbpljkhdcavszmwnjkwtclrtvaynhpahrtoxmwvwatmedibkaegdosftvandiodagdhthtrlnnhy",
        "ur:bytes/8-9/lpayascfadaxcywenbpljkhdcadmsponkkbbhgsoltjntegepmttmoonftnbuoiyrehfrtsabzsttorodklubbuyaetk",
        "ur:bytes/9-9/lpasascfadaxcywenbpljkhdcajskecpmdckihdyhphfotjojtfmlnwmadspaxrkytbztpbauotbgtgtaeaevtgavtny",
        "ur:bytes/10-9/lpbkascfadaxcywenbpljkhdcahkadaemejtswhhylkepmykhhtsytsnoyoyaxaedsuttydmmhhpktpmsrjtwdkiplzs",
        "ur:bytes/11-9/lpbdascfadaxcywenbpljkhdcahelbknlkuejnbadmssfhfrdpsbiegecpasvssovlgeykssjykklronvsjkvetiiapk",
        "ur:bytes/12-9/lpbnascfadaxcywenbpljkhdcarllaluzmdmgstospeyiefmwejlwtpedamktksrvlcygmzemovovllarodtmtbnptrs",
        "ur:bytes/13-9/lpbtascfadaxcywenbpljkhdcamtkgtpknghchchyketwsvwgwfdhpgmgtylctotzopdrpayoschcmhplffziachrfgd",
        "ur:bytes/14-9/lpbaascfadaxcywenbpljkhdcapazewnvonnvdnsbyleynwtnsjkjndeoldydkbkdslgjkbbkortbelomueekgvstegt",
        "ur:bytes/15-9/lpbsascfadaxcywenbpljkhdcaynmhpddpzmversbdqdfyrehnqzlugmjzmnmtwmrouohtstgsbsahpawkditkckynwt",
        "ur:bytes/16-9/lpbeascfadaxcywenbpljkhdcawygekobamwtlihsnpalnsghenskkiynthdzotsimtojetprsttmukirlrsbtamjtpd",
        "ur:bytes/17-9/lpbyascfadaxcywenbpljkhdcamklgftaxykpewyrtqzhydntpnytyisincxmhtbceaykolduortotiaiaiafhiaoyce",
        "ur:bytes/18-9/lpbgascfadaxcywenbpljkhdcahkadaemejtswhhylkepmykhhtsytsnoyoyaxaedsuttydmmhhpktpmsrjtntwkbkwy",
        "ur:bytes/19-9/lpbwascfadaxcywenbpljkhdcadekicpaajootjzpsdrbalpeywllbdsnbinaerkurspbncxgslgftvtsrjtksplcpeo",
        "ur:bytes/20-9/lpbbascfadaxcywenbpljkhdcayapmrleeleaxpasfrtrdkncffwjyjzgyetdmlewtkpktgllepfrltataztksmhkbot"
      ]
      console.log(parts)
      expect(parts).toEqual(expectedParts);
    });
  });
  describe('console', () => {
    test('asdf', () => {
      const ur = UR.from('{"test":"test"}', 'utf-8')
      console.log(ur.cbor.toString("utf-8"))
      const encoder = new UREncoder(ur, 10)
      const parts = [...new Array(20)].map(() => encoder.nextPart())
      const decoder = new URDecoder()

      do {
        // Scan the part from a QRCode
        // the part should look like this:
        // ur:bytes/1-9/lpadascfadaxcywenbpljkhdcahkadaemejtswhhylkepmykhhtsytsnoyoyaxaedsuttydmmhhpktpmsrjtdkgslpgh
        const part = encoder.nextPart()

        // register the new part with the decoder
        decoder.receivePart(part)

        // check if all the necessary parts have been received to successfully decode the message
      } while (!decoder.isComplete())

      // If no error has been found
      if (decoder.isSuccess()) {
        // Get the UR representation of the message
        const ur = decoder.resultUR()

        // Decode the CBOR message to a Buffer
        const decoded = ur.decodeCBOR()

        // get the original message, assuming it was a JSON object
        console.log("message was"+decoded.toString())
      }
      else {
        // log and handle the error
        const error = decoder.resultError()
        console.log('Error found while decoding', error)
      }
      console.log(parts)
    });
  });
});
